package com.sprout.timepractice;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.WindowManager;
import android.widget.TextView;
import androidx.core.content.ContextCompat;

/** Ordinary, non-exported Activity fallback. Never impersonates a call/alarm. */
public class GuardQuizActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private boolean attached;
    private long waitUntil;
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if (!eligible()) { finish(); return; }
        TextView loading = new TextView(this); loading.setText("学伴时光 · 正在准备原生答题…"); loading.setGravity(android.view.Gravity.CENTER); setContentView(loading);
        waitUntil = SystemClock.elapsedRealtime() + 5_000;
        try { ContextCompat.startForegroundService(this, new Intent(this, GuardService.class)); }
        catch (Exception failure) { GuardDiagnostics.record(this, "quiz_service_rejected", failure.getClass().getSimpleName()); finish(); }
    }
    private boolean eligible() { return prefs.getBoolean("active", false) && prefs.getBoolean("locked", false); }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); }
    @Override protected void onResume() { super.onResume(); if (!isFinishing()) attach(); }
    private void attach() {
        if (isFinishing() || isDestroyed()) return;
        if (!eligible() || ParentAccessActivity.isVisible()) { finish(); return; }
        if (attached) return;
        if (GuardService.attachQuizActivity(this)) { attached = true; return; }
        if (SystemClock.elapsedRealtime() < waitUntil) handler.postDelayed(this::attach, 100);
        else { GuardDiagnostics.record(this, "quiz_attach_timeout", "原生答题页等待服务超时"); finish(); }
    }
    @Override protected void onPause() { super.onPause(); /* IME/focus changes do not reattach the overlay. */ }
    @Override protected void onStop() {
        handler.removeCallbacksAndMessages(null); GuardService.releaseQuizActivity(this); attached = false;
        super.onStop();
    }
    @Override public void onBackPressed() { startActivity(new Intent(this, ParentAccessActivity.class)); }
    boolean fromNotification() { return getIntent().getBooleanExtra("fromNotification", false); }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); GuardService.releaseQuizActivity(this); super.onDestroy(); }
}