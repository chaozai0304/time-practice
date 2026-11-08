package com.sprout.timepractice;
import static org.junit.Assert.*;
import android.speech.tts.Voice;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.annotation.Config;
@RunWith(org.robolectric.RobolectricTestRunner.class)
@Config(sdk = 28)
public class EnglishSpeechTest {
    private Voice voice(String name, Locale locale, boolean network) { return new Voice(name, locale, Voice.QUALITY_NORMAL, Voice.LATENCY_NORMAL, network, Collections.emptySet()); }
    @Test public void selectsOnlyOfflineEnglishWithStablePreference() { Voice uk = voice("local-uk", Locale.UK, false); Set<Voice> voices = new HashSet<>(); voices.add(voice("remote-us", Locale.US, true)); voices.add(voice("local-us", Locale.US, false)); voices.add(voice("local-cn", Locale.CHINA, false)); voices.add(uk); assertSame(uk, EnglishSpeech.localVoice(voices)); }
    @Test public void neverFallsBackToNetworkOrWrongLanguage() { Set<Voice> voices = new HashSet<>(); voices.add(voice("remote", Locale.US, true)); voices.add(voice("chinese", Locale.CHINA, false)); assertNull(EnglishSpeech.localVoice(voices)); assertNull(EnglishSpeech.localVoice(null)); }
    @Test public void uninstalledVoiceCannotTriggerAutomaticResourceDownload() { Voice missing = new Voice("missing", Locale.UK, Voice.QUALITY_NORMAL, Voice.LATENCY_NORMAL, false, Collections.singleton(android.speech.tts.TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)); assertNull(EnglishSpeech.localVoice(Collections.singleton(missing))); }
    @Test public void acceptsWordsAndPhrasesNotChineseOrMarkup() { assertTrue(EnglishSpeech.validText("apple")); assertTrue(EnglishSpeech.validText("thank you")); assertFalse(EnglishSpeech.validText("苹果")); assertFalse(EnglishSpeech.validText("<script>")); assertFalse(EnglishSpeech.validText(null)); }
    @Test public void closedEngineDoesNotStartOrClaimAvailability() { EnglishSpeech speech = new EnglishSpeech(org.robolectric.RuntimeEnvironment.getApplication()); speech.close(); final boolean[] called = { false }; speech.speak("apple", (available, message) -> { called[0] = true; assertFalse(available); }); assertTrue(called[0]); }
}