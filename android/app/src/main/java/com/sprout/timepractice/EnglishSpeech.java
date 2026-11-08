package com.sprout.timepractice;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Local English voices only. No downloads, microphone, or network synthesis. */
final class EnglishSpeech {
    interface Result { void done(boolean available, String message); }
    private final Context context;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayList<Result> waiting = new ArrayList<>();
    private TextToSpeech engine;
    private boolean loading, ready, closed;
    private int generation;
    private String message = "没有可用的离线英语语音，请继续文字练习；不会自动下载语音。";
    private final Runnable timeout = () -> complete(false);
    EnglishSpeech(Context context) { this.context = context.getApplicationContext(); }
    static boolean validText(String text) { return text != null && text.length() <= 80 && text.matches("(?i)[a-z]+(?:[ '-][a-z]+)*"); }
    static Voice localVoice(Set<Voice> voices) {
        if (voices == null) return null;
        return voices.stream().filter(v -> "en".equals(v.getLocale().getLanguage()) && !v.isNetworkConnectionRequired() && (v.getFeatures() == null || !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)))
            .sorted(Comparator.comparingInt((Voice v) -> Locale.UK.equals(v.getLocale()) ? 0 : Locale.US.equals(v.getLocale()) ? 1 : 2).thenComparing(Voice::getName)).findFirst().orElse(null);
    }
    void prepare(Result result) {
        if (closed) { result.done(false, "朗读已停止"); return; }
        if (engine != null && !loading) { result.done(ready, message); return; }
        waiting.add(result); if (loading) return;
        loading = true; handler.postDelayed(timeout, 3000);
        try { engine = new TextToSpeech(context, status -> handler.post(() -> {
            if (closed || !loading) return;
            try {
                Voice voice = status == TextToSpeech.SUCCESS ? localVoice(engine.getVoices()) : null;
                complete(voice != null && engine.setVoice(voice) == TextToSpeech.SUCCESS && engine.setSpeechRate(.8f) == TextToSpeech.SUCCESS);
            } catch (Exception unavailable) { complete(false); }
        })); } catch (Exception unavailable) { complete(false); }
    }
    private void complete(boolean available) {
        handler.removeCallbacks(timeout); loading = false; ready = available;
        if (available) message = "系统离线英语语音已准备，不联网合成。";
        ArrayList<Result> callbacks = new ArrayList<>(waiting); waiting.clear(); for (Result callback : callbacks) callback.done(available, message);
    }
    void speak(String text, Result result) {
        if (!validText(text)) { result.done(false, "只朗读英语单词或短语"); return; }
        stop(); final int request = generation;
        prepare((available, detail) -> {
            if (closed || request != generation) { result.done(false, "朗读已取消"); return; }
            if (!available) { result.done(false, detail); return; }
            try { boolean accepted = engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString()) == TextToSpeech.SUCCESS; result.done(accepted, accepted ? "已请求离线朗读，请听发音并填写英文。" : "朗读未能启动，文字练习不受影响。"); }
            catch (Exception unavailable) { result.done(false, "朗读不可用，请继续文字练习。"); }
        });
    }
    void stop() { generation++; if (engine != null) try { engine.stop(); } catch (Exception ignored) {} }
    void close() { closed = true; stop(); complete(false); if (engine != null) engine.shutdown(); handler.removeCallbacksAndMessages(null); }
}