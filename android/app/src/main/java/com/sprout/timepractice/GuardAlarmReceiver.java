package com.sprout.timepractice;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;

/** Inexact fallback; no exact-alarm permission or forced background Activity. */
public class GuardAlarmReceiver extends BroadcastReceiver {
    private static final String ACTION = "com.sprout.timepractice.GUARD_DEADLINE";
    private static PendingIntent alarm(Context context, String session) {
        return PendingIntent.getBroadcast(context, 74, new Intent(context, GuardAlarmReceiver.class).setAction(ACTION)
            .putExtra("sessionId", session), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context context, SharedPreferences prefs) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pending = alarm(context, prefs.getString("sessionId", ""));
        if (!prefs.getBoolean("active", false) || prefs.getBoolean("locked", false)) { manager.cancel(pending); return; }
        long deadline = prefs.getLong("deadlineElapsed", 0);
        if (deadline > SystemClock.elapsedRealtime()) manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, pending);
    }
    static void cancel(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager != null) manager.cancel(alarm(context, ""));
        NotificationManager notifications = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifications != null) notifications.cancel(74);
    }
    @Override public void onReceive(Context context, Intent intent) {
        if (!ACTION.equals(intent.getAction())) return;
        SharedPreferences prefs = context.getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("active", false) || !prefs.getString("sessionId", "").equals(intent.getStringExtra("sessionId"))) return;
        if (GuardRuntime.shouldLock(true, prefs.getBoolean("locked", false), prefs.getLong("deadlineElapsed", 0), SystemClock.elapsedRealtime())) {
            prefs.edit().putBoolean("locked", true).putInt("correct", 0).putInt("index", 0).apply();
            GuardDiagnostics.record(context, "deadline_alarm", "定时到期，检查后台守护");
        }
        if (GuardService.running) GuardService.requestCheck();
        else {
            prefs.edit().putString("error", "后台服务已被系统停止，请返回应用恢复，并检查应用启动管理与电池优化").apply();
            GuardDiagnostics.record(context, "service_interrupted", "到期时前台服务未运行");
            notifyParent(context);
        }
    }
    private void notifyParent(Context context) {
        try {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            manager.createNotificationChannel(new NotificationChannel("guard_recovery", "学习守护提醒", NotificationManager.IMPORTANCE_DEFAULT));
            PendingIntent open = PendingIntent.getActivity(context, 74, new Intent(context, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            manager.notify(74, new Notification.Builder(context, "guard_recovery").setSmallIcon(R.drawable.ic_stat_sprout)
                .setContentTitle("学习守护需要恢复").setContentText("点击返回应用，检查荣耀应用启动管理与后台权限。").setContentIntent(open).setAutoCancel(true).build());
        } catch (Exception ignored) { /* Notification denial must not fabricate a running guard. */ }
    }
}