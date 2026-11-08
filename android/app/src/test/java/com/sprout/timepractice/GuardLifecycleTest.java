package com.sprout.timepractice;

import static org.junit.Assert.*;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.Shadows;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.android.controller.ServiceController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;
import org.robolectric.shadows.ShadowSettings;
import org.robolectric.shadows.ShadowSystemClock;
import org.robolectric.util.ReflectionHelpers;

@RunWith(org.robolectric.RobolectricTestRunner.class)
@Config(sdk = 28)
@LooperMode(LooperMode.Mode.PAUSED)
public class GuardLifecycleTest {
    private SharedPreferences prefs;
    private ServiceController<GuardService> service;
    private ActivityController<ParentAccessActivity> parent;
    private ActivityController<GuardQuizActivity> quiz;
    private PowerManager power;

    @Before public void prepare() throws Exception {
        Context app = RuntimeEnvironment.getApplication();
        // AndroidX's signature permission is present in the merged manifest. Real
        // installs grant it to this UID; Robolectric does not automatically do so.
        Shadows.shadowOf(RuntimeEnvironment.getApplication()).grantPermissions(app.getPackageName() + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION");
        prefs = app.getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE); prefs.edit().clear().commit();
        power = (PowerManager) app.getSystemService(Context.POWER_SERVICE); Shadows.shadowOf(power).setIsInteractive(true);
        Shadows.shadowOf((KeyguardManager) app.getSystemService(Context.KEYGUARD_SERVICE)).setKeyguardLocked(false);
        ShadowSettings.setCanDrawOverlays(true);
        byte[] salt = new byte[16]; StringBuilder hash = new StringBuilder();
        PBEKeySpec spec = new PBEKeySpec("135790".toCharArray(), salt, 120000, 256);
        for (byte value : SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded()) hash.append(String.format("%02x", value & 255));
        spec.clearPassword();
        JSONObject credential = new JSONObject().put("salt", "00000000000000000000000000000000").put("iterations", 120000).put("hash", hash.toString());
        JSONObject question = new JSONObject().put("id", "fixture").put("subject", "数学").put("grade", 3).put("prompt", "1 + 1 = ?").put("answer", "2").put("options", new JSONArray());
        JSONObject config = new JSONObject().put("credential", credential).put("questions", new JSONArray().put(question)).put("settings", new JSONObject().put("requiredCorrect", 3).put("intervalMinutes", 1));
        prefs.edit().putBoolean("active", true).putBoolean("locked", false).putString("sessionId", "test-session")
            .putString("config", config.toString()).putLong("deadlineElapsed", SystemClock.elapsedRealtime() + 60_000).commit();
    }
    @After public void cleanup() {
        if (parent != null) { if (ParentAccessActivity.isVisible()) parent.pause().stop(); parent.destroy(); parent = null; }
        if (quiz != null) { quiz.pause().stop().destroy(); quiz = null; }
        if (service != null) { service.destroy(); service = null; }
        GuardService.running = false; GuardService.currentSessionId = ""; GuardService.heartbeatElapsed = 0;
    }
    private void idle() { Shadows.shadowOf(Looper.getMainLooper()).idle(); }
    private GuardService startService() { service = Robolectric.buildService(GuardService.class).create().startCommand(0, 1); idle(); return service.get(); }
    private View overlay() { return ReflectionHelpers.getField(service.get(), "overlay"); }
    private ParentAccessActivity openParent() { parent = Robolectric.buildActivity(ParentAccessActivity.class).setup(); idle(); return parent.get(); }
    private GuardQuizActivity openQuiz() { quiz = Robolectric.buildActivity(GuardQuizActivity.class).setup(); idle(); return quiz.get(); }
    private void lock() { prefs.edit().putBoolean("locked", true).putInt("correct", 1).commit(); startService(); }
    private void submit(String value) throws Exception {
        ParentAccessActivity activity = parent.get(); ((EditText) activity.findViewById(R.id.parent_pin)).setText(value);
        activity.findViewById(R.id.parent_verify).performClick();
        ExecutorService worker = ReflectionHelpers.getField(activity, "worker"); worker.submit(() -> {}).get(10, TimeUnit.SECONDS); idle();
    }
    private <T extends View> T find(View view, Class<T> type) {
        if (type.isInstance(view)) return type.cast(view);
        if (view instanceof ViewGroup) for (int i = 0; i < ((ViewGroup) view).getChildCount(); i++) { T found = find(((ViewGroup) view).getChildAt(i), type); if (found != null) return found; }
        return null;
    }
    private Button namedButton(View view, String label) {
        if (view instanceof Button && label.contentEquals(((Button) view).getText())) return (Button) view;
        if (view instanceof ViewGroup) for (int i = 0; i < ((ViewGroup) view).getChildCount(); i++) { Button found = namedButton(((ViewGroup) view).getChildAt(i), label); if (found != null) return found; }
        return null;
    }
    @Test public void timerLocksWithoutAnyMainActivity() {
        startService(); assertNull(overlay());
        ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); idle();
        assertTrue(prefs.getBoolean("locked", false)); assertNotNull(overlay());
        WindowManager.LayoutParams window = (WindowManager.LayoutParams) overlay().getLayoutParams();
        assertEquals(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, window.type);
        assertEquals(WindowManager.LayoutParams.MATCH_PARENT, window.width); assertEquals(WindowManager.LayoutParams.MATCH_PARENT, window.height);
        assertTrue(GuardService.running);
    }
    @Test public void screenOffKeepsDeadlineAndRestoresAfterUnlock() {
        Shadows.shadowOf(power).setIsInteractive(false); long deadline = prefs.getLong("deadlineElapsed", 0); startService();
        ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); idle(); assertTrue(prefs.getBoolean("locked", false)); assertNull(overlay());
        Shadows.shadowOf(power).setIsInteractive(true); GuardService.requestCheck(); idle();
        assertNotNull(overlay()); assertEquals(deadline, prefs.getLong("deadlineElapsed", 0));
    }
    @Test public void overlayConfigurationChangeKeepsAnswerAndWindow() {
        lock(); View original = overlay(); EditText answer = find(original, EditText.class); assertNotNull(answer); answer.setText("123");
        Configuration changed = new Configuration(service.get().getResources().getConfiguration()); changed.orientation = Configuration.ORIENTATION_LANDSCAPE; changed.keyboardHidden = Configuration.KEYBOARDHIDDEN_NO;
        service.get().onConfigurationChanged(changed); idle();
        assertSame(original, overlay()); assertSame(answer, find(overlay(), EditText.class)); assertEquals("123", answer.getText().toString());
    }
    @Test public void unconfirmedParentLaunchDoesNotRemoveGuard() {
        lock(); View original = overlay(); namedButton(original, "家长退出").performClick(); idle();
        assertSame(original, overlay()); assertTrue(prefs.getBoolean("locked", false)); assertTrue(prefs.getBoolean("active", false));
    }
    @Test public void parentPageTemporarilyReplacesOverlayWithoutUnlocking() {
        lock(); ParentAccessActivity activity = openParent(); assertFalse(activity.isFinishing()); assertTrue(ParentAccessActivity.isVisible()); assertNull(overlay());
        assertTrue(prefs.getBoolean("active", false)); assertTrue(prefs.getBoolean("locked", false)); assertEquals(1, prefs.getInt("correct", 0));
    }
    @Test public void keyboardAndRotationDoNotRecreatePinInput() {
        lock(); ParentAccessActivity activity = openParent(); EditText pin = activity.findViewById(R.id.parent_pin); pin.setText("135");
        Configuration changed = new Configuration(activity.getResources().getConfiguration()); changed.orientation = Configuration.ORIENTATION_LANDSCAPE; changed.keyboardHidden = Configuration.KEYBOARDHIDDEN_NO;
        parent.configurationChange(changed); idle();
        assertSame(activity, parent.get()); assertSame(pin, parent.get().findViewById(R.id.parent_pin)); assertEquals("135", pin.getText().toString()); assertFalse(activity.isFinishing());
        assertFalse(pin.isSaveEnabled()); assertEquals(WindowManager.LayoutParams.FLAG_SECURE, activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE);
    }
    @Test public void cancelRestoresOverlayAndKeepsProgress() {
        lock(); ParentAccessActivity activity = openParent(); long deadline = prefs.getLong("deadlineElapsed", 0); activity.findViewById(R.id.parent_cancel).performClick(); assertTrue(activity.isFinishing()); parent.pause().stop(); idle();
        assertTrue(prefs.getBoolean("active", false)); assertTrue(prefs.getBoolean("locked", false)); assertEquals(1, prefs.getInt("correct", 0)); assertEquals(deadline, prefs.getLong("deadlineElapsed", 0)); assertNotNull(overlay());
    }
    @Test public void leavingParentPageRestoresOverlay() { lock(); openParent(); parent.pause(); idle(); assertNull(overlay()); assertTrue(prefs.getBoolean("locked", false)); parent.stop(); idle(); assertNotNull(overlay()); }
    @Test public void backIsCancelNotAnUnprotectedExit() { lock(); ParentAccessActivity activity = openParent(); activity.onBackPressed(); parent.pause().stop(); idle(); assertTrue(activity.isFinishing()); assertTrue(prefs.getBoolean("active", false)); assertNotNull(overlay()); }
    @Test public void wrongPinKeepsPageOpenAndGuardActive() throws Exception {
        lock(); ParentAccessActivity activity = openParent(); submit("999999");
        assertFalse(activity.isFinishing()); assertTrue(prefs.getBoolean("active", false)); assertTrue(prefs.getBoolean("locked", false)); assertEquals(1, prefs.getInt("failures", 0));
        assertTrue(((TextView) activity.findViewById(R.id.parent_error)).getText().toString().contains("不正确"));
    }
    @Test public void correctPinStopsGuard() throws Exception { lock(); ParentAccessActivity activity = openParent(); submit("135790"); assertFalse(prefs.getBoolean("active", true)); assertFalse(prefs.getBoolean("locked", true)); assertTrue(activity.isFinishing()); assertEquals("", ((EditText) activity.findViewById(R.id.parent_pin)).getText().toString()); }
    @Test public void fiveWrongPinsRateLimitWithoutClosingPage() throws Exception { lock(); ParentAccessActivity activity = openParent(); for (int i = 0; i < 5; i++) submit("999999"); submit("135790"); assertFalse(activity.isFinishing()); assertTrue(prefs.getBoolean("active", false)); assertTrue(((TextView) activity.findViewById(R.id.parent_error)).getText().toString().contains("30 秒")); }
    @Test public void runningConfirmationRejectsWrongSessionAndStaleHeartbeat() { startService(); assertTrue(GuardService.isRunningFor("test-session")); assertFalse(GuardService.isRunningFor("old-session")); ShadowSystemClock.advanceBy(Duration.ofSeconds(6)); assertFalse(GuardService.isRunningFor("test-session")); GuardService.requestCheck(); idle(); assertTrue(GuardService.isRunningFor("test-session")); }
    @Test public void serviceRestartKeepsOriginalDeadline() {
        long deadline = prefs.getLong("deadlineElapsed", 0); startService(); service.destroy(); service = null;
        ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); startService();
        assertEquals(deadline, prefs.getLong("deadlineElapsed", 0)); assertTrue(prefs.getBoolean("locked", false)); assertNotNull(overlay());
    }
    @Test public void killedServiceProducesDiagnosticReminderInsteadOfFakeRunning() {
        ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); Context app = RuntimeEnvironment.getApplication();
        new GuardAlarmReceiver().onReceive(app, new Intent("com.sprout.timepractice.GUARD_DEADLINE").putExtra("sessionId", "test-session"));
        assertTrue(prefs.getBoolean("locked", false)); assertFalse(GuardService.running); assertTrue(prefs.getString("error", "").contains("停止"));
        assertNotNull(Shadows.shadowOf((NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE)).getNotification(74));
    }
    @Test public void staleAlarmCannotLockNewSession() {
        ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); new GuardAlarmReceiver().onReceive(RuntimeEnvironment.getApplication(), new Intent("com.sprout.timepractice.GUARD_DEADLINE").putExtra("sessionId", "old-session"));
        assertFalse(prefs.getBoolean("locked", false));
    }
    @Test @Config(sdk = 35) public void modernAndroidUsesIndependentOverlayWindowContext() {
        lock(); Context context = ReflectionHelpers.getField(service.get(), "overlayContext"); assertNotSame(service.get(), context); assertNotNull(overlay());
        assertEquals(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, ((WindowManager.LayoutParams) overlay().getLayoutParams()).type);
    }
    @Test public void backgroundDeadlineRequestsOrdinaryActivityOnlyOnce() {
        startService(); ShadowSystemClock.advanceBy(Duration.ofSeconds(61)); idle();
        Intent entry = Shadows.shadowOf(service.get()).getNextStartedActivity(); assertNotNull(entry);
        assertEquals(GuardQuizActivity.class.getName(), entry.getComponent().getClassName());
        ShadowSystemClock.advanceBy(Duration.ofSeconds(3)); idle();
        assertNull(Shadows.shadowOf(service.get()).getNextStartedActivity()); assertTrue(prefs.getBoolean("locked", false));
    }
    @Test public void unconfirmedBackgroundActivityIsLoggedNotReportedAsShown() {
        lock(); ShadowSystemClock.advanceBy(Duration.ofSeconds(3)); idle();
        assertEquals(0, prefs.getLong("lastQuizActivityAt", 0)); assertTrue(prefs.getString("error", "").contains("未确认"));
        assertTrue(prefs.getString("diagnostics", "").contains("quiz_activity_not_confirmed")); assertNotNull(overlay());
    }
    @Test public void temporaryParentFocusLossDoesNotRestoreOverlay() {
        lock(); ParentAccessActivity activity = openParent(); EditText pin = activity.findViewById(R.id.parent_pin); pin.setText("135");
        assertFalse(pin.getShowSoftInputOnFocus()); assertFalse(pin.isFocusable()); activity.onWindowFocusChanged(false); parent.pause(); idle();
        assertTrue(ParentAccessActivity.isVisible()); assertNull(overlay()); assertEquals("135", pin.getText().toString());
        parent.resume(); idle(); assertFalse(activity.isFinishing()); assertNull(overlay());
    }
    @Test @Config(sdk = 35) public void inlineKeypadDeletesLimitsAndVerifiesWithoutSystemKeyboard() throws Exception {
        lock(); ParentAccessActivity activity = openParent(); EditText pin = activity.findViewById(R.id.parent_pin);
        assertFalse(pin.getShowSoftInputOnFocus());
        View root = activity.getWindow().getDecorView(); root.findViewWithTag("parent-key-1").performClick(); root.findViewWithTag("parent-key-3").performClick();
        root.findViewWithTag("parent-key-删除").performClick(); assertEquals("1", pin.getText().toString()); root.findViewWithTag("parent-key-清空").performClick(); assertEquals("", pin.getText().toString());
        for (char digit : "1357908".toCharArray()) root.findViewWithTag("parent-key-" + digit).performClick(); assertEquals("135790", pin.getText().toString());
        activity.findViewById(R.id.parent_verify).performClick(); ExecutorService worker = ReflectionHelpers.getField(activity, "worker"); worker.submit(() -> {}).get(10, TimeUnit.SECONDS); idle();
        assertFalse(prefs.getBoolean("active", true)); assertTrue(activity.isFinishing());
    }
    @Test public void activityAndOverlayShareProgressWithoutDoubleWindows() {
        lock(); GuardQuizActivity activity = openQuiz(); assertTrue(GuardService.isQuizActivityVisible()); assertNull(overlay());
        View root = activity.getWindow().getDecorView().findViewWithTag("native-guard-question"); assertNotNull(root); assertSame(activity, find(root, EditText.class).getContext());
        find(root, EditText.class).setText("2"); namedButton(root, "确认答案  →").performClick(); idle();
        assertEquals(2, prefs.getInt("correct", 0)); assertNull(overlay());
        ShadowSystemClock.advanceBy(Duration.ofSeconds(3)); idle(); assertSame(root, activity.getWindow().getDecorView().findViewWithTag("native-guard-question"));
    }
    @Test public void leavingQuizActivityRestoresOverlayWithSameProgress() {
        lock(); openQuiz(); quiz.pause().stop(); idle(); assertNotNull(overlay()); assertFalse(GuardService.isQuizActivityVisible()); assertEquals(1, prefs.getInt("correct", 0));
    }
    @Test public void passingInNativeActivityClosesBothQuestionSurfaces() {
        lock(); GuardQuizActivity activity = openQuiz(); View root = activity.getWindow().getDecorView().findViewWithTag("native-guard-question");
        for (int i = 0; i < 2; i++) { find(root, EditText.class).setText("2"); namedButton(root, "确认答案  →").performClick(); idle(); }
        assertFalse(prefs.getBoolean("locked", true)); assertTrue(prefs.getBoolean("active", false)); assertNull(overlay()); assertFalse(GuardService.isQuizActivityVisible()); assertTrue(activity.isFinishing());
    }
    @Test public void nativeActivityToParentKeypadDoesNotBringQuestionBackOnPause() {
        lock(); openQuiz(); ParentAccessActivity activity = openParent();
        activity.getWindow().getDecorView().findViewWithTag("parent-key-1").performClick(); parent.pause(); idle();
        assertNull(overlay()); assertFalse(GuardService.isQuizActivityVisible()); assertEquals("1", ((EditText) activity.findViewById(R.id.parent_pin)).getText().toString());
        parent.stop(); idle(); assertNotNull(overlay()); assertTrue(prefs.getBoolean("locked", false));
    }
    @Test public void booleanQuizUsesFixedButtonsAndWrongAnswerKeepsLock() throws Exception {
        JSONObject config = new JSONObject(prefs.getString("config", "{}"));
        config.getJSONArray("questions").getJSONObject(0).put("type", "boolean").put("answer", "错误").put("grade", 8);
        prefs.edit().putString("config", config.toString()).commit(); lock();
        View root = overlay(); assertNull(find(root, EditText.class));
        namedButton(root, "A   正确").performClick(); namedButton(root, "确认答案  →").performClick(); idle();
        assertTrue(prefs.getBoolean("locked", false)); assertEquals(1, prefs.getInt("correct", 0));
        namedButton(root, "B   错误").performClick(); namedButton(root, "确认答案  →").performClick(); idle();
        assertEquals(2, prefs.getInt("correct", 0)); assertTrue(prefs.getBoolean("locked", false));
        JSONArray attempts = new JSONArray(prefs.getString("attempts", "[]")); assertEquals(2, attempts.length()); assertFalse(attempts.getJSONObject(0).getBoolean("correct")); assertTrue(attempts.getJSONObject(1).getBoolean("correct"));
    }
    @Test public void allDisabledConfigurationCannotStartAQuestionlessGuard() throws Exception {
        JSONObject config = new JSONObject(prefs.getString("config", "{}")); config.getJSONArray("questions").getJSONObject(0).put("enabled", false);
        prefs.edit().putString("config", config.toString()).commit(); startService(); assertFalse(prefs.getBoolean("active", true)); assertNull(overlay()); assertTrue(prefs.getString("error", "").contains("启用"));
    }
    @Test public void nativeDictationKeepsAnswerProgressDeadlineAndDoesNotCreateAnAttempt() throws Exception {
        JSONObject config = new JSONObject(prefs.getString("config", "{}")); config.getJSONArray("questions").getJSONObject(0).put("subject", "英语").put("answer", "apple").put("semester", "lower").put("lesson", 7).put("lessonTitle", "太空探索"); prefs.edit().putString("config", config.toString()).commit(); lock();
        View root = overlay(); long deadline = prefs.getLong("deadlineElapsed", 0); Button listen = namedButton(root, "听英文（听写）"); assertNotNull(listen); listen.performClick(); idle(); assertEquals("", find(root, EditText.class).getText().toString()); assertEquals(1, prefs.getInt("correct", 0)); assertEquals(deadline, prefs.getLong("deadlineElapsed", 0)); assertEquals(0, new JSONArray(prefs.getString("attempts", "[]")).length()); assertTrue(prefs.getBoolean("locked", false));
    }
}