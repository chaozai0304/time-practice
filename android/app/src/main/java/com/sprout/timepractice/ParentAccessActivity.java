package com.sprout.timepractice;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputFilter;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** PIN entry is a real Activity, never an editable application overlay. */
public class ParentAccessActivity extends Activity {
    private static volatile boolean visible;
    static boolean isVisible() { return visible; }
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private SharedPreferences prefs;
    private EditText pin;
    private Button verify;
    private TextView error;
    private boolean verifying;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        if (!prefs.getBoolean("active", false)) { finish(); return; }
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(Color.rgb(8, 15, 34));
        LinearLayout outer = new LinearLayout(this); outer.setOrientation(LinearLayout.VERTICAL); outer.setGravity(Gravity.CENTER); outer.setPadding(dp(24), dp(40), dp(24), dp(32)); scroll.addView(outer);
        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL); card.setPadding(dp(24), dp(24), dp(24), dp(24));
        GradientDrawable background = new GradientDrawable(); background.setColor(Color.rgb(18, 30, 55)); background.setCornerRadius(dp(22)); card.setBackground(background);
        LinearLayout.LayoutParams cardLayout = new LinearLayout.LayoutParams(Math.min(getResources().getDisplayMetrics().widthPixels - dp(48), dp(540)), ViewGroup.LayoutParams.WRAP_CONTENT); outer.addView(card, cardLayout);
        outer.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob) -> { int width = Math.min(Math.max(dp(220), r-l-dp(48)), dp(540)); if (cardLayout.width != width) { cardLayout.width = width; card.setLayoutParams(cardLayout); } });
        addText(card, "家长安全退出", 25, true);
        addText(card, "输入密码后停止学习守护。取消或返回不会停止守护，也不会丢失答题进度。", 15, false);
        pin = new EditText(this); pin.setId(R.id.parent_pin); pin.setSingleLine(true); pin.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        pin.setFilters(new InputFilter[] { new InputFilter.LengthFilter(6) }); pin.setTextSize(22); pin.setTextColor(Color.WHITE); pin.setHintTextColor(Color.rgb(159, 180, 208)); pin.setHint("6 位家长密码");
        pin.setSaveEnabled(false); pin.setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS); card.addView(pin, block());
        pin.setShowSoftInputOnFocus(false); pin.setFocusable(false); pin.setFocusableInTouchMode(false); pin.setCursorVisible(false); pin.setLongClickable(false);
        addText(card, "请使用下方数字键盘输入，不会唤起系统输入法。", 14, false);
        addKeypad(card);
        error = new TextView(this); error.setId(R.id.parent_error); error.setTextColor(Color.rgb(249, 181, 163)); error.setTextSize(14); card.addView(error, block());
        verify = addButton(card, "验证并停止守护", true); verify.setId(R.id.parent_verify); verify.setOnClickListener(v -> verifyAndStop());
        Button cancel = addButton(card, "取消，返回答题", false); cancel.setId(R.id.parent_cancel); cancel.setOnClickListener(v -> finish());
        addText(card, "密码只在本机验证；连续输错 5 次暂停验证 30 秒。", 12, false);
        setContentView(scroll);
        GuardDiagnostics.record(this, "parent_page_opened", "原生家长验证页面创建");
    }
    @Override protected void onResume() { super.onResume(); if (!isFinishing()) { visible = true; GuardDiagnostics.record(this, "parent_resumed", "家长数字键盘页面接管"); GuardService.requestCheck(); } }
    // Temporary focus changes must not put a focusable overlay over the PIN page.
    @Override protected void onPause() { GuardDiagnostics.record(this, "parent_paused", "暂时暂停，等待页面真正不可见再恢复遮罩"); super.onPause(); }
    @Override protected void onStop() { visible = false; GuardDiagnostics.record(this, "parent_stopped_view", "家长页已不可见，恢复答题"); GuardService.requestCheck(); super.onStop(); }
    @Override public void onBackPressed() { if (!verifying) finish(); }
    private void verifyAndStop() {
        if (verifying) return;
        String value = pin.getText().toString();
        if (!value.matches("[0-9]{6}")) { error.setText("请输入 6 位数字家长密码"); return; }
        verifying = true; verify.setEnabled(false); error.setText("正在验证…");
        worker.execute(() -> {
            try {
                JSONObject credential = new JSONObject(prefs.getString("config", "{}")).getJSONObject("credential");
                boolean valid = GuardAuth.verify(value, credential, prefs);
                handler.post(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    verifying = false; verify.setEnabled(true);
                    if (!valid) { error.setText("密码不正确，请重试。窗口不会自动关闭。"); return; }
                    prefs.edit().putBoolean("active", false).putBoolean("locked", false).putString("error", "").apply();
                    GuardAlarmReceiver.cancel(this); stopService(new Intent(this, GuardService.class));
                    GuardDiagnostics.record(this, "parent_stopped", "家长验证成功并停止守护");
                    pin.getText().clear(); finish();
                });
            } catch (Exception failure) { handler.post(() -> { if (!isFinishing() && !isDestroyed()) { verifying = false; verify.setEnabled(true); error.setText(failure.getMessage() == null ? "验证失败，请重试" : failure.getMessage()); } }); }
        });
    }
    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }
    private void addKeypad(LinearLayout card) {
        String[][] keys = {{"1", "2", "3"}, {"4", "5", "6"}, {"7", "8", "9"}, {"清空", "0", "删除"}};
        for (String[] values : keys) {
            LinearLayout row = new LinearLayout(this); card.addView(row, block());
            for (String value : values) {
                Button key = new Button(this); key.setText(value); key.setTag("parent-key-" + value); key.setAllCaps(false); key.setTextSize(21); key.setTextColor(Color.WHITE); key.setMinHeight(dp(50));
                GradientDrawable shape = new GradientDrawable(); shape.setColor(Color.rgb(31, 46, 72)); shape.setCornerRadius(dp(12)); key.setBackground(shape);
                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, dp(54), 1); p.setMargins(dp(4), 0, dp(4), 0); row.addView(key, p);
                key.setOnClickListener(v -> {
                    if (verifying) return;
                    if ("清空".equals(value)) pin.getText().clear();
                    else if ("删除".equals(value)) { int n = pin.length(); if (n > 0) pin.getText().delete(n - 1, n); }
                    else if (pin.length() < 6) pin.append(value);
                    if (error != null) error.setText("");
                });
            }
        }
    }
    private LinearLayout.LayoutParams block() { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); p.setMargins(0, dp(10), 0, dp(10)); return p; }
    private void addText(LinearLayout card, String value, int size, boolean bold) { TextView text = new TextView(this); text.setText(value); text.setTextSize(size); text.setTextColor(Color.rgb(222, 233, 251)); if (bold) text.setTypeface(null, Typeface.BOLD); text.setLineSpacing(dp(4), 1); card.addView(text, block()); }
    private Button addButton(LinearLayout card, String value, boolean primary) { Button button = new Button(this); button.setText(value); button.setAllCaps(false); button.setTextSize(16); button.setTextColor(Color.WHITE); button.setMinHeight(dp(50)); GradientDrawable shape = new GradientDrawable(); shape.setColor(primary ? Color.rgb(104, 84, 186) : Color.rgb(31, 46, 72)); shape.setCornerRadius(dp(13)); button.setBackground(shape); card.addView(button, block()); return button; }
    @Override protected void onDestroy() { visible = false; GuardService.requestCheck(); worker.shutdown(); handler.removeCallbacksAndMessages(null); super.onDestroy(); }
}