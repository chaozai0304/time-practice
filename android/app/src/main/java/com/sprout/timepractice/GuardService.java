package com.sprout.timepractice;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.animation.ValueAnimator;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.hardware.display.DisplayManager;
import android.view.Display;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.InputFilter;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.FrameLayout;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.RenderProcessGoneDetail;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

public class GuardService extends Service {
    static final String PREFS = "sprout.native.guard";
    static volatile boolean running = false;
    static volatile long heartbeatElapsed = 0;
    static volatile String currentSessionId = "";
    private static volatile GuardService instance;
    private static final String CHANNEL = "learning_guard";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private WindowManager windows;
    private Context overlayContext;
    private Context uiContext;
    private GuardQuizActivity quizActivity;
    private boolean activityLaunchAttempted;
    private String lastDisplayState = "";
    private View overlay;
    private LinearLayout content;
    private FrameLayout motionHost;
    private WebView motionView;
    private Button motionToggle;
    private boolean motionPaused = false;
    private JSONArray questions;
    private JSONObject config;
    private EnglishSpeech speech;
    private int overlayWidth, overlayHeight;
    private long heartbeatSavedAt, overlayRetryAt;
    private final int green = Color.rgb(103, 87, 206), ink = Color.rgb(236, 243, 255);
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!prefs.getBoolean("active", false)) { stopSelf(); return; }
            if (!Settings.canDrawOverlays(GuardService.this)) { fail("浮层权限已撤销，请由家长重新授权"); return; }
            long now = SystemClock.elapsedRealtime(); heartbeatElapsed = now;
            if (now - heartbeatSavedAt >= 15_000) { heartbeatSavedAt = now; prefs.edit().putLong("lastHeartbeatAt", System.currentTimeMillis()).apply(); }
            if (GuardRuntime.shouldLock(true, prefs.getBoolean("locked", false), prefs.getLong("deadlineElapsed", 0), now)) {
                prefs.edit().putBoolean("locked", true).putInt("correct", 0).putInt("index", 0).apply();
                GuardDiagnostics.record(GuardService.this, "deadline_locked", "原生计时到期，不依赖主界面是否前台");
            }
            PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
            KeyguardManager keyguard = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            boolean locked = prefs.getBoolean("locked", false);
            boolean show = GuardRuntime.shouldShowOverlay(true, locked, power.isInteractive(), keyguard.isKeyguardLocked(), ParentAccessActivity.isVisible());
            if (show) { showOverlay(); if (!MainActivity.isForeground() && quizActivity == null) requestQuizActivity(); }
            else { closeQuizActivity(); removeOverlay(); }
            if (!locked) activityLaunchAttempted = false;
            String state = "locked=" + locked + "; interactive=" + power.isInteractive() + "; keyguard=" + keyguard.isKeyguardLocked()
                + "; parent=" + ParentAccessActivity.isVisible() + "; mainForeground=" + MainActivity.isForeground() + "; quizActivity=" + (quizActivity != null)
                + "; overlay=" + (overlay != null) + "; windowVisibility=" + (overlay == null ? -1 : overlay.getWindowVisibility());
            if (!state.equals(lastDisplayState)) { lastDisplayState = state; prefs.edit().putString("displayState", state).apply(); GuardDiagnostics.record(GuardService.this, "display_state", state); }
            handler.postDelayed(this, 1000);
        }
    };
    static void requestCheck() {
        GuardService service = instance;
        if (service != null) { service.handler.removeCallbacks(service.tick); service.handler.post(service.tick); }
    }
    static boolean isRunningFor(String session) { return running && currentSessionId.equals(session) && SystemClock.elapsedRealtime() - heartbeatElapsed < 5_000; }
    static boolean isOverlayVisible() { GuardService service = instance; return service != null && service.overlay != null && service.overlay.isAttachedToWindow() && service.overlay.getVisibility() == View.VISIBLE; }
    static int getOverlayWidth() { GuardService service = instance; return service == null ? 0 : service.overlayWidth; }
    static int getOverlayHeight() { GuardService service = instance; return service == null ? 0 : service.overlayHeight; }
    static boolean isQuizActivityVisible() { GuardService service = instance; return service != null && service.quizActivity != null && !service.quizActivity.isFinishing(); }
    static boolean attachQuizActivity(GuardQuizActivity owner) {
        GuardService service = instance;
        if (service == null || !running || service.config == null || !service.prefs.getBoolean("active", false) || !service.prefs.getBoolean("locked", false) || ParentAccessActivity.isVisible()) return false;
        if (service.quizActivity == owner) return true;
        service.closeQuizActivity(); service.removeOverlay();
        service.quizActivity = owner;
        owner.setContentView(service.createQuizRoot(owner));
        service.createMotionView(); service.renderQuestion();
        if (!service.prefs.getBoolean("active", false)) return false;
        service.prefs.edit().putLong("lastQuizActivityAt", System.currentTimeMillis()).putString("lastQuizActivitySource", owner.fromNotification() ? "notification" : "automatic").apply();
        GuardDiagnostics.record(service, "quiz_activity_resumed", owner.fromNotification() ? "用户点击通知进入原生答题页" : "普通原生答题页已进入前台");
        requestCheck(); return true;
    }
    static void releaseQuizActivity(GuardQuizActivity owner) {
        GuardService service = instance;
        if (service != null && service.quizActivity == owner) {
            service.quizActivity = null; service.clearQuizUi();
            GuardDiagnostics.record(service, "quiz_activity_hidden", "原生答题页已不可见，恢复浮层"); requestCheck();
        }
    }
    private void closeQuizActivity() { if (quizActivity != null) { GuardQuizActivity old = quizActivity; quizActivity = null; clearQuizUi(); old.finish(); } }
    private void requestQuizActivity() {
        if (activityLaunchAttempted || ParentAccessActivity.isVisible() || !prefs.getBoolean("active", false) || !prefs.getBoolean("locked", false)) return;
        activityLaunchAttempted = true;
        long requested = System.currentTimeMillis(); prefs.edit().putLong("lastQuizRequestAt", requested).apply();
        GuardDiagnostics.record(this, "quiz_activity_requested", "后台到期，尝试普通原生答题入口；不使用全屏来电权限");
        try {
            startActivity(new Intent(this, GuardQuizActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            handler.postDelayed(() -> {
                if (prefs.getBoolean("active", false) && prefs.getBoolean("locked", false) && prefs.getLong("lastQuizActivityAt", 0) < requested && !ParentAccessActivity.isVisible()) {
                    prefs.edit().putString("error", "后台答题页面未确认显示，请检查荣耀后台弹出界面权限，并导出诊断").apply();
                    GuardDiagnostics.record(this, "quiz_activity_not_confirmed", "普通后台入口未确认；不能仅凭浮层已挂载判断拦截成功");
                }
            }, 2500);
        } catch (Exception rejected) { GuardDiagnostics.record(this, "quiz_activity_rejected", rejected.getClass().getSimpleName()); }
    }
    private final BroadcastReceiver screenReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) removeOverlay();
            handler.removeCallbacks(tick); handler.post(tick);
        }
    };

    @Override public void onCreate() {
        super.onCreate(); instance = this; prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        DisplayManager displays = (DisplayManager) getSystemService(DISPLAY_SERVICE);
        Display display = displays == null ? null : displays.getDisplay(Display.DEFAULT_DISPLAY);
        overlayContext = display == null ? this : createDisplayContext(display);
        if (Build.VERSION.SDK_INT >= 30) overlayContext = overlayContext.createWindowContext(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, null);
        uiContext = overlayContext;
        windows = (WindowManager) overlayContext.getSystemService(WINDOW_SERVICE);
        IntentFilter filter = new IntentFilter(); filter.addAction(Intent.ACTION_SCREEN_OFF); filter.addAction(Intent.ACTION_SCREEN_ON); filter.addAction(Intent.ACTION_USER_PRESENT);
        ContextCompat.registerReceiver(this, screenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "学习守护状态", NotificationManager.IMPORTANCE_LOW));
            PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            PendingIntent parent = PendingIntent.getActivity(this, 75, new Intent(this, ParentAccessActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            PendingIntent quiz = PendingIntent.getActivity(this, 76, new Intent(this, GuardQuizActivity.class).putExtra("fromNotification", true), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
            Notification notification = builder.setSmallIcon(R.drawable.ic_stat_sprout).setContentTitle("学伴时光 · 学习守护已开启")
                .setContentText("到时间答题，答对再继续。点击家长退出可验证密码停止。").setContentIntent(open).addAction(new Notification.Action.Builder(null, "去答题", quiz).build()).addAction(new Notification.Action.Builder(null, "家长退出", parent).build()).setOngoing(true).build();
            if (Build.VERSION.SDK_INT >= 34) startForeground(73, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(73, notification);
            config = new JSONObject(prefs.getString("config", "{}")); questions = GuardQuestions.enabled(config.getJSONArray("questions"));
            if (!prefs.getBoolean("active", false)) { stopSelf(); return START_NOT_STICKY; }
            if (questions.length() == 0) { fail("当前没有启用的题目，请由家长检查题库"); return START_NOT_STICKY; }
            int boot = Settings.Global.getInt(getContentResolver(), Settings.Global.BOOT_COUNT, 0);
            if (prefs.getInt("boot", boot) != boot) { fail("设备重启后，请由家长重新开启守护"); return START_NOT_STICKY; }
            String session = prefs.getString("sessionId", ""); if (!session.equals(currentSessionId)) activityLaunchAttempted = false;
            currentSessionId = session;
            running = true; heartbeatElapsed = SystemClock.elapsedRealtime(); prefs.edit().putString("error", "").putLong("lastHeartbeatAt", System.currentTimeMillis()).apply();
            GuardAlarmReceiver.schedule(this, prefs);
            GuardDiagnostics.record(this, "service_started", "原生前台服务运行");
            handler.removeCallbacks(tick); handler.post(tick);
            return START_STICKY;
        } catch (Exception e) { fail("守护配置或前台服务不可用，请重新开启"); return START_NOT_STICKY; }
    }

    private void showOverlay() {
        if (overlay != null || quizActivity != null) return;
        if (SystemClock.elapsedRealtime() < overlayRetryAt) return;
        FrameLayout root = createQuizRoot(overlayContext);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP; params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        params.setTitle("学伴时光原生答题遮罩");
        try { windows.addView(root, params); overlay = root; createMotionView(); renderQuestion(); if (overlay != root || !prefs.getBoolean("active", false)) return; prefs.edit().putString("error", "").putLong("lastOverlayAt", System.currentTimeMillis()).apply(); GuardDiagnostics.record(this, "overlay_created", "系统级浮层已创建"); }
        catch (Exception e) { try { windows.removeView(root); } catch (Exception ignored) {} overlay = null; clearQuizUi(); overlayRetryAt = SystemClock.elapsedRealtime() + 5_000; prefs.edit().putString("error", "系统拒绝后台浮层，请检查荣耀后台弹出与应用启动权限").apply(); GuardDiagnostics.record(this, "overlay_rejected", e.getClass().getSimpleName()); }
    }
    private FrameLayout createQuizRoot(Context context) {
        uiContext = context;
        FrameLayout root = new FrameLayout(context) {
            @Override protected void onWindowVisibilityChanged(int visibility) { super.onWindowVisibilityChanged(visibility); GuardDiagnostics.record(GuardService.this, "quiz_window_visibility", "visibility=" + visibility + "; activity=" + (quizActivity != null)); }
        };
        root.setTag("native-guard-question"); root.setBackgroundColor(Color.rgb(7, 11, 36));
        root.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob) -> {
            overlayWidth = r-l; overlayHeight = b-t;
            resizeContent(overlayWidth);
        });
        motionHost = new FrameLayout(context); motionHost.setBackgroundColor(Color.rgb(4, 8, 25));
        root.addView(motionHost, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        View readability = new View(context);
        readability.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[] { Color.argb(25, 4, 8, 25), Color.argb(100, 4, 8, 25), Color.argb(55, 4, 8, 25) }));
        root.addView(readability, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        ScrollView scroll = new ScrollView(context); scroll.setFillViewport(true); scroll.setClipToPadding(false); scroll.setPadding(0, dp(68), 0, 0);
        LinearLayout outer = new LinearLayout(context); outer.setGravity(Gravity.CENTER); outer.setOrientation(LinearLayout.VERTICAL);
        outer.setPadding(dp(20), dp(12), dp(20), dp(35)); scroll.addView(outer);
        root.addView(scroll, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        content = new LinearLayout(context); content.setOrientation(LinearLayout.VERTICAL);
        int width = Math.min(context.getResources().getDisplayMetrics().widthPixels - dp(40), dp(600));
        content.setBackgroundColor(Color.TRANSPARENT); content.setPadding(dp(12), dp(17), dp(12), dp(20));
        outer.addView(content, new LinearLayout.LayoutParams(Math.max(dp(220), width), LinearLayout.LayoutParams.WRAP_CONTENT));
        Button emergency = new Button(context); emergency.setText("家长退出"); emergency.setTextSize(14); emergency.setAllCaps(false); emergency.setTextColor(Color.WHITE); emergency.setBackground(background(Color.rgb(30, 42, 77)));
        FrameLayout.LayoutParams emergencyParams = new FrameLayout.LayoutParams(dp(110), dp(48), Gravity.TOP | Gravity.END); emergencyParams.setMargins(0, dp(12), dp(18), 0); root.addView(emergency, emergencyParams); emergency.setOnClickListener(v -> openParent());
        motionToggle = new Button(context); motionToggle.setTextSize(14); motionToggle.setAllCaps(false); motionToggle.setTextColor(Color.rgb(200, 222, 255)); motionToggle.setBackground(background(Color.rgb(25, 34, 64)));
        FrameLayout.LayoutParams toggleParams = new FrameLayout.LayoutParams(dp(130), dp(48), Gravity.TOP | Gravity.START); toggleParams.setMargins(dp(18), dp(12), 0, 0); root.addView(motionToggle, toggleParams);
        motionToggle.setOnClickListener(v -> { motionPaused = !motionPaused; updateMotion(); });
        return root;
    }

    private void renderQuestion() {
        if (content == null) return;
        if (speech != null) speech.stop();
        content.removeAllViews();
        content.setBackgroundColor(Color.TRANSPARENT);
        if (motionHost != null) motionHost.setVisibility(View.VISIBLE);
        try {
            int index = prefs.getInt("index", 0), correct = prefs.getInt("correct", 0);
            JSONObject q = questions.getJSONObject(index % questions.length());
            int target = config.getJSONObject("settings").getInt("requiredCorrect");
            updateMotion();
            addText("✦  学伴时光 · 给大脑充个电", 18, Color.rgb(203, 198, 250), true);
            addText("已答对 " + correct + " / " + target + " 道。答对后就能继续玩。", 15, ink, false);
            addText(q.getString("subject") + " · " + GuardQuestions.gradeLabel(q.getInt("grade")) + " · " + (GuardQuestions.booleanType(q) ? "判断题" : q.getJSONArray("options").length() == 0 ? "填空题" : "选择题"), 13, Color.rgb(182, 203, 233), false);
            String semester = q.optString("semester", "unspecified"); int lesson = q.optInt("lesson", 0);
            if (!"unspecified".equals(semester) || lesson > 0) addText(("upper".equals(semester) ? "上册" : "lower".equals(semester) ? "下册" : "册次未标注") + " · " + (lesson > 0 ? "第 " + lesson + " 课" : "课次未标注") + " " + q.optString("lessonTitle"), 13, Color.rgb(182, 203, 233), false);
            addText(q.getString("prompt"), 28, ink, true);
            JSONArray options = GuardQuestions.booleanType(q) ? new JSONArray().put("正确").put("错误") : q.getJSONArray("options");
            final String[] selected = { "" };
            TextView feedback = new TextView(uiContext); feedback.setTextSize(15); feedback.setTextColor(Color.rgb(250, 215, 152));
            EditText input = null;
            if ("英语".equals(q.optString("subject")) && options.length() == 0 && EnglishSpeech.validText(q.optString("answer"))) {
                Button listen = button("听英文（听写）", false);
                listen.setOnClickListener(v -> {
                    if (speech == null) speech = new EnglishSpeech(this);
                    speech.speak(q.optString("answer"), (available, message) -> { if (listen.getParent() != null) feedback.setText(message); });
                });
            }
            if (options.length() == 0) {
                input = new EditText(uiContext); input.setSingleLine(true); input.setTextSize(20); input.setHint("填写你的答案"); input.setFilters(new InputFilter[] { new InputFilter.LengthFilter(160) });
                input.setTextColor(ink); input.setHintTextColor(Color.rgb(179, 197, 220)); input.setBackground(answerBackground(false)); input.setPadding(dp(16), dp(14), dp(16), dp(14));
                content.addView(input, blockParams());
            } else {
                ArrayList<String> values = new ArrayList<>(); for (int i = 0; i < options.length(); i++) values.add(options.getString(i));
                if (!GuardQuestions.booleanType(q)) Collections.shuffle(values);
                ArrayList<Button> buttons = new ArrayList<>();
                for (int i = 0; i < values.size(); i++) {
                    String option = values.get(i); Button b = button((char) ('A' + i) + "   " + option, false); buttons.add(b);
                    b.setOnClickListener(v -> { selected[0] = option; feedback.setText(""); for (Button other : buttons) { other.setBackground(answerBackground(false)); other.setSelected(false); } b.setBackground(answerBackground(true)); b.setSelected(true); });
                }
            }
            content.addView(feedback, blockParams());
            EditText finalInput = input;
            Button confirm = button("确认答案  →", true);
            confirm.setOnClickListener(v -> {
                String answer = finalInput == null ? selected[0] : finalInput.getText().toString();
                if (answer.trim().isEmpty()) { feedback.setText("请先选择或填写答案"); return; }
                try {
                    boolean right = GuardQuestions.correct(q, answer);
                    record(q, answer, right);
                    if (!right) { feedback.setText("差一点点！再读一遍题目，继续试试。答错不会扣分。"); return; }
                    if (correct + 1 >= target) {
                        JSONArray history = GuardQuestions.history(config.optJSONArray("history") == null ? new JSONArray() : config.getJSONArray("history"), new JSONArray(prefs.getString("attempts", "[]")));
                        questions = GuardQuestions.prioritize(questions, history, System.currentTimeMillis(), Math::random);
                        config.put("questions", questions);
                        prefs.edit().putBoolean("locked", false).putInt("correct", 0).putInt("index", 0)
                            .putLong("deadlineElapsed", SystemClock.elapsedRealtime() + config.getJSONObject("settings").getInt("intervalMinutes") * 60_000L)
                            .putString("config", config.toString()).apply();
                        GuardAlarmReceiver.schedule(this, prefs);
                        closeQuizActivity();
                        removeOverlay();
                    } else { prefs.edit().putInt("correct", correct + 1).putInt("index", index + 1).apply(); renderQuestion(); }
                } catch (Exception e) { fail("无法保存答题进度，请由家长检查本地存储"); }
            });
            Button parent = button("家长密码退出", false); parent.setOnClickListener(v -> openParent());
            addText("每一点努力，都会长成大大的进步", 12, Color.rgb(179, 199, 224), false);
        } catch (Exception e) { fail("题目数据不可用，请由家长重新导入"); }
    }

    static String normalize(String answer) { return Normalizer.normalize(answer, Normalizer.Form.NFKC).trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }

    private void record(JSONObject q, String answer, boolean correct) throws Exception {
        JSONObject record = new JSONObject().put("id", UUID.randomUUID().toString()).put("questionId", q.getString("id"))
            .put("prompt", q.getString("prompt")).put("subject", q.getString("subject")).put("answer", answer.trim()).put("correct", correct).put("at", System.currentTimeMillis());
        JSONArray old = new JSONArray(prefs.getString("attempts", "[]"));
        JSONArray next = new JSONArray(); for (int i = Math.max(0, old.length() - 9999); i < old.length(); i++) next.put(old.get(i)); next.put(record);
        if (!prefs.edit().putString("attempts", next.toString()).commit()) throw new Exception("存储失败");
    }

    private void openParent() {
        if (speech != null) speech.stop();
        try {
            startActivity(new Intent(this, ParentAccessActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            GuardDiagnostics.record(this, "parent_requested", "浮层点击家长退出");
            // Keep the overlay until Activity.onResume confirms the native page is visible.
            handler.postDelayed(() -> { if (prefs.getBoolean("active", false) && !ParentAccessActivity.isVisible()) { GuardDiagnostics.record(this, "parent_not_visible", "系统没有显示家长页，请使用通知中的家长退出"); android.widget.Toast.makeText(this, "若密码页未出现，请点守护通知中的「家长退出」", android.widget.Toast.LENGTH_LONG).show(); } }, 1500);
        } catch (Exception blocked) {
            GuardDiagnostics.record(this, "parent_launch_rejected", blocked.getClass().getSimpleName());
            android.widget.Toast.makeText(this, "请点守护通知中的「家长退出」", android.widget.Toast.LENGTH_LONG).show();
        }
    }
    private void resizeContent(int width) { if (content == null || width <= 0) return; ViewGroup.LayoutParams params = content.getLayoutParams(); int target = Math.max(dp(180), Math.min(width-dp(40), dp(600))); if (params != null && params.width != target) { params.width = target; content.setLayoutParams(params); } }

    private int dp(int value) { return (int) (value * (uiContext == null ? getResources() : uiContext.getResources()).getDisplayMetrics().density + .5f); }
    private LinearLayout.LayoutParams blockParams() { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT); p.setMargins(0, dp(8), 0, dp(8)); return p; }
    private GradientDrawable background(int color) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(14)); return d; }
    private void addText(String text, int size, int color, boolean bold) { TextView view = new TextView(uiContext); view.setText(text); view.setTextSize(size); view.setTextColor(color); view.setPadding(0, dp(5), 0, dp(5)); if (bold) view.setTypeface(null, Typeface.BOLD); content.addView(view, blockParams()); }
    private GradientDrawable answerBackground(boolean selected) { GradientDrawable d = background(selected ? Color.argb(220, 87, 73, 147) : Color.argb(185, 13, 28, 52)); d.setStroke(dp(1), selected ? Color.rgb(212, 196, 255) : Color.argb(200, 154, 181, 213)); return d; }
    private Button button(String text, boolean primary) { Button b = new Button(uiContext); b.setText(text); b.setAllCaps(false); b.setTextSize(17); b.setTextColor(ink); GradientDrawable surface = primary ? background(green) : answerBackground(false); if (primary) surface.setStroke(dp(1), Color.rgb(184, 176, 230)); b.setBackground(surface); b.setMinHeight(dp(54)); b.setPadding(dp(15), dp(13), dp(15), dp(13)); content.addView(b, blockParams()); return b; }
    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    private void createMotionView() {
        try {
            // No JavaScript bridge, no question/PIN data, no remote resources.
            motionView = new WebView(uiContext); motionView.setBackgroundColor(Color.rgb(7, 11, 36));
            motionView.setFocusable(false); motionView.setFocusableInTouchMode(false); motionView.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
            motionView.getSettings().setJavaScriptEnabled(true);
            motionView.getSettings().setAllowFileAccess(false); motionView.getSettings().setAllowContentAccess(false);
            motionView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            final WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
            motionView.setWebViewClient(new WebViewClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    WebResourceResponse local = loader.shouldInterceptRequest(request.getUrl());
                    return local != null ? local : new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
                }
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
                @Override public void onPageFinished(WebView view, String url) { updateMotion(); }
                @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { destroyMotion(); showStaticMotion(); return true; }
            });
            motionHost.addView(motionView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            motionView.loadUrl("https://appassets.androidplatform.net/assets/public/guard-motion.html");
        } catch (Exception unavailable) { destroyMotion(); showStaticMotion(); }
    }
    private void showStaticMotion() {
        if (motionHost == null) return;
        TextView fallback = new TextView(this); fallback.setText("知识星门\n认真思考，点亮你的学习能量"); fallback.setTextSize(19); fallback.setTextColor(Color.rgb(170, 214, 249)); fallback.setGravity(Gravity.CENTER);
        motionHost.addView(fallback, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }
    private void updateMotion() {
        boolean paused = motionPaused || ParentAccessActivity.isVisible() || !ValueAnimator.areAnimatorsEnabled();
        if (motionToggle != null) { motionToggle.setText(!ValueAnimator.areAnimatorsEnabled() ? "已减少动态效果" : motionPaused ? "播放星门特效" : "暂停星门特效"); motionToggle.setEnabled(ValueAnimator.areAnimatorsEnabled()); }
        if (motionView == null || config == null) return;
        try {
            double progress = prefs.getInt("correct", 0) / (double) Math.max(1, config.getJSONObject("settings").getInt("requiredCorrect"));
            String state = new JSONObject().put("progress", progress).put("paused", paused).toString();
            motionView.evaluateJavascript("window.__sproutGuardMotion=" + state + ";window.dispatchEvent(new CustomEvent('sprout:guard-motion',{detail:window.__sproutGuardMotion}));", null);
        } catch (Exception ignored) { /* Animation must never block native exit or answers. */ }
    }
    private void destroyMotion() { if (motionView != null) { if (motionHost != null) motionHost.removeView(motionView); motionView.stopLoading(); motionView.onPause(); motionView.destroy(); motionView = null; } }
    private void clearQuizUi() { if (speech != null) speech.stop(); destroyMotion(); content = null; motionHost = null; motionToggle = null; overlayWidth = 0; overlayHeight = 0; uiContext = overlayContext; }
    private void removeOverlay() { if (overlay != null) { try { windows.removeView(overlay); } catch (Exception ignored) {} overlay = null; clearQuizUi(); } }
    private void fail(String message) { prefs.edit().putBoolean("active", false).putBoolean("locked", false).putString("error", message).apply(); GuardAlarmReceiver.cancel(this); GuardDiagnostics.record(this, "guard_error", message); removeOverlay(); stopSelf(); }
    @Override public void onConfigurationChanged(Configuration config) { super.onConfigurationChanged(config); if (overlay != null) resizeContent(overlay.getWidth()); }
    @Override public void onTaskRemoved(Intent rootIntent) { GuardAlarmReceiver.schedule(this, prefs); GuardDiagnostics.record(this, "task_removed", "主界面退出最近任务，原生守护仍继续"); super.onTaskRemoved(rootIntent); }
    @Override public void onDestroy() { if (speech != null) speech.close(); running = false; heartbeatElapsed = 0; currentSessionId = ""; if (instance == this) instance = null; handler.removeCallbacksAndMessages(null); closeQuizActivity(); removeOverlay(); unregisterReceiver(screenReceiver); GuardDiagnostics.record(this, "service_destroyed", prefs.getBoolean("active", false) ? "系统停止服务，配置仍待恢复" : "守护已正常停止"); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}