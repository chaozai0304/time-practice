package com.sprout.timepractice;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.UUID;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "LearningGuard")
public class LearningGuardPlugin extends Plugin {
    private final ExecutorService authWorker = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private EnglishSpeech speech;
    private EnglishSpeech speech() { if (speech == null) speech = new EnglishSpeech(getContext()); return speech; }
    private SharedPreferences prefs() { return getContext().getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE); }

    @PluginMethod public void getSpeechStatus(PluginCall call) {
        getActivity().runOnUiThread(() -> speech().prepare((available, message) -> call.resolve(new JSObject().put("available", available).put("message", message))));
    }
    @PluginMethod public void speakEnglish(PluginCall call) {
        getActivity().runOnUiThread(() -> speech().speak(call.getString("text"), (available, message) -> call.resolve(new JSObject().put("available", available).put("message", message))));
    }
    @PluginMethod public void stopSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (speech != null) speech.stop(); call.resolve(); });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            SharedPreferences p = prefs();
            int boot = Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.BOOT_COUNT, 0);
            if (p.getInt("boot", boot) != boot) {
                p.edit().putBoolean("active", false).putBoolean("locked", false).putInt("failures", 0)
                    .putLong("blockedUntilElapsed", 0).putInt("boot", boot).putString("error", "设备重启后，请由家长重新开启守护").apply();
            }
            JSObject result = new JSObject();
            result.put("active", p.getBoolean("active", false));
            result.put("locked", p.getBoolean("locked", false));
            result.put("deadline", System.currentTimeMillis() + p.getLong("deadlineElapsed", 0) - SystemClock.elapsedRealtime());
            result.put("correct", p.getInt("correct", 0));
            result.put("overlayGranted", Settings.canDrawOverlays(getContext()));
            boolean running = GuardService.isRunningFor(p.getString("sessionId", ""));
            result.put("running", running);
            result.put("error", p.getBoolean("active", false) && !running ? "后台服务未运行或计时已中断，请由家长恢复并检查后台权限" : p.getString("error", ""));
            result.put("overlayVisible", GuardService.isOverlayVisible());
            result.put("overlayWidth", GuardService.getOverlayWidth()); result.put("overlayHeight", GuardService.getOverlayHeight());
            result.put("parentVisible", ParentAccessActivity.isVisible());
            result.put("quizActivityVisible", GuardService.isQuizActivityVisible());
            result.put("mainForeground", MainActivity.isForeground());
            result.put("displayState", p.getString("displayState", ""));
            result.put("lastQuizRequestAt", p.getLong("lastQuizRequestAt", 0));
            result.put("lastQuizActivityAt", p.getLong("lastQuizActivityAt", 0));
            result.put("lastQuizActivitySource", p.getString("lastQuizActivitySource", ""));
            result.put("appVersion", getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName);
            result.put("lastHeartbeatAt", p.getLong("lastHeartbeatAt", 0)); result.put("lastOverlayAt", p.getLong("lastOverlayAt", 0));
            PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            result.put("batteryUnrestricted", power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
            result.put("notificationsAllowed", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
            result.put("device", Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE + " / API " + Build.VERSION.SDK_INT);
            result.put("diagnostics", new JSArray(p.getString("diagnostics", "[]")));
            result.put("attempts", new JSArray(p.getString("attempts", "[]")));
            call.resolve(result);
        } catch (Exception e) { call.reject("无法读取守护状态", e); }
    }

    @PluginMethod
    public void openBackgroundSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = "battery".equals(call.getString("screen")) ? new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent); call.resolve();
            } catch (Exception failure) { call.reject("请在系统设置中搜索学伴时光，允许后台活动与悬浮窗", failure); }
        });
    }

    @PluginMethod
    public void resumeService(PluginCall call) {
        SharedPreferences p = prefs();
        if (!p.getBoolean("active", false)) { call.reject("没有待恢复的守护，请重新开启"); return; }
        if (!Settings.canDrawOverlays(getContext())) { call.reject("请先重新授权跨应用浮层"); return; }
        getActivity().runOnUiThread(() -> {
            if (!getActivity().hasWindowFocus()) { call.reject("请在应用前台点击恢复后台守护"); return; }
            launchAndConfirm(call, p, false);
        });
    }

    private void launchAndConfirm(PluginCall call, SharedPreferences p, boolean newSession) {
        String session = p.getString("sessionId", "");
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), GuardService.class));
            long limit = SystemClock.elapsedRealtime() + 8_000;
            handler.post(new Runnable() {
                @Override public void run() {
                    if (!p.getBoolean("active", false) || !session.equals(p.getString("sessionId", ""))) { call.reject("守护启动被取消或系统拒绝，请检查后台权限"); return; }
                    if (GuardService.isRunningFor(session)) {
                        GuardDiagnostics.record(getContext(), newSession ? "start_confirmed" : "recovery_confirmed", "已确认原生计时服务运行，原到期时间保留"); call.resolve(); return;
                    }
                    if (SystemClock.elapsedRealtime() < limit) { handler.postDelayed(this, 100); return; }
                    p.edit().putString("error", "原生服务没有确认启动，请检查荣耀应用启动与后台权限").apply();
                    if (newSession) { p.edit().putBoolean("active", false).putBoolean("locked", false).apply(); getContext().stopService(new Intent(getContext(), GuardService.class)); GuardAlarmReceiver.cancel(getContext()); }
                    call.reject("守护未成功启动，请检查后台权限后重试");
                }
            });
        } catch (Exception failure) {
            if (newSession) p.edit().putBoolean("active", false).putBoolean("locked", false).apply();
            p.edit().putString("error", "系统拒绝启动，请检查后台权限").apply(); call.reject("守护启动失败", failure);
        }
    }

    @PluginMethod
    public void requestOverlay(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName())));
                call.resolve();
            } catch (Exception e) { call.reject("无法打开浮层授权，请在系统设置中手动授权", e); }
        });
    }

    @PluginMethod
    public void start(PluginCall call) {
        JSArray questions = call.getArray("questions");
        JSObject settings = call.getObject("settings"), credential = call.getObject("credential");
        if (questions == null || questions.length() == 0 || questions.length() > 5000 || settings == null || credential == null) { call.reject("题库或家长密码未准备好"); return; }
        if (prefs().getBoolean("active", false)) { call.reject("守护已运行，请先用家长密码停止"); return; }
        if (!Settings.canDrawOverlays(getContext())) { call.reject("请先授权显示在其他应用上层"); return; }
        int minutes = settings.optInt("intervalMinutes", 0), target = settings.optInt("requiredCorrect", 0);
        if (minutes < 1 || minutes > 120 || target < 1 || target > 20) { call.reject("学习规则无效"); return; }
        try {
            for (int i = 0; i < questions.length(); i++) {
                JSONObject q = questions.getJSONObject(i);
                if (q.getString("prompt").trim().isEmpty() || q.getString("answer").trim().isEmpty() || !q.has("options")) throw new Exception("无效题目");
            }
            SharedPreferences p = prefs();
            JSONArray enabled = GuardQuestions.enabled(questions);
            if (enabled.length() == 0) { call.reject("当前没有启用的题目"); return; }
            JSArray importedAttempts = call.getArray("attempts");
            JSONArray history = GuardQuestions.history(importedAttempts == null ? new JSONArray() : importedAttempts, new JSONArray(p.getString("attempts", "[]")));
            JSONObject config = new JSONObject().put("questions", GuardQuestions.prioritize(enabled, history, System.currentTimeMillis(), Math::random)).put("settings", settings).put("credential", credential).put("history", history);
            if (!p.edit().putString("config", config.toString()).putBoolean("active", true).putBoolean("locked", false)
                .putString("sessionId", UUID.randomUUID().toString())
                .putLong("lastQuizRequestAt", 0).putLong("lastQuizActivityAt", 0).putString("lastQuizActivitySource", "")
                .putLong("deadlineElapsed", SystemClock.elapsedRealtime() + minutes * 60_000L).putInt("correct", 0).putInt("index", 0)
                .putInt("boot", Settings.Global.getInt(getContext().getContentResolver(), Settings.Global.BOOT_COUNT, 0))
                .putString("error", "").commit()) { call.reject("设备存储不可用"); return; }
            getActivity().runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 404);
                    }
                    launchAndConfirm(call, p, true);
                } catch (Exception e) { p.edit().putBoolean("active", false).putString("error", "系统拒绝启动，请检查后台权限").apply(); call.reject("守护启动失败", e); }
            });
        } catch (Exception e) { call.reject("题库配置无效", e); }
    }

    @PluginMethod
    public void verifyParent(PluginCall call) {
        authWorker.execute(() -> {
            try {
                JSONObject credential = prefs().getBoolean("active", false) ? new JSONObject(prefs().getString("config", "{}")).getJSONObject("credential") : call.getObject("credential");
                call.resolve(new JSObject().put("valid", GuardAuth.verify(call.getString("pin"), credential, prefs())));
            } catch (Exception e) { call.reject(e.getMessage() == null ? "家长验证失败" : e.getMessage()); }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        authWorker.execute(() -> {
            try {
                JSONObject credential = new JSONObject(prefs().getString("config", "{}")).getJSONObject("credential");
                if (!GuardAuth.verify(call.getString("pin"), credential, prefs())) { call.reject("家长密码不正确"); return; }
                prefs().edit().putBoolean("active", false).putBoolean("locked", false).apply();
                GuardAlarmReceiver.cancel(getContext());
                getContext().stopService(new Intent(getContext(), GuardService.class));
                call.resolve();
            } catch (Exception e) { call.reject(e.getMessage() == null ? "停止守护失败" : e.getMessage()); }
        });
    }

    @Override
    protected void handleOnDestroy() { if (speech != null) speech.close(); authWorker.shutdown(); handler.removeCallbacksAndMessages(null); }
}