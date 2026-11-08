package com.sprout.timepractice;
import static org.junit.Assert.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.annotation.Config;
@RunWith(org.robolectric.RobolectricTestRunner.class)
@Config(sdk = 28)
public class GuardQuestionsTest {
    private JSONObject question(String id) throws Exception { return new JSONObject().put("id", id).put("answer", "apple").put("options", new JSONArray()); }
    private JSONObject attempt(String id, String question, boolean correct, long at) throws Exception { return new JSONObject().put("id", id).put("questionId", question).put("correct", correct).put("at", at); }
    @Test public void disabledQuestionsNeverEnterQueue() throws Exception { JSONArray pool = new JSONArray().put(question("yes")).put(question("no").put("enabled", false)); assertEquals(1, GuardQuestions.enabled(pool).length()); assertEquals("yes", GuardQuestions.prioritize(pool, new JSONArray(), 1000, () -> .5).getJSONObject(0).getString("id")); }
    @Test public void newAndOftenWrongAreWeightedBeforeMasteredWhenRandomEqual() throws Exception {
        JSONArray pool = new JSONArray().put(question("good")).put(question("new")).put(question("bad"));
        JSONArray history = new JSONArray().put(attempt("1", "good", true, 100)).put(attempt("2", "bad", false, 100));
        // Five recent unrelated attempts avoid the intended recent penalty for these two test subjects.
        for (int i = 0; i < 5; i++) history.put(attempt("recent" + i, "other" + i, true, 200 + i));
        JSONArray sorted = GuardQuestions.prioritize(pool, history, 1000, () -> .5);
        assertEquals("bad", sorted.getJSONObject(0).getString("id")); assertEquals("new", sorted.getJSONObject(1).getString("id")); assertEquals("good", sorted.getJSONObject(2).getString("id")); assertEquals(3, sorted.length()); assertEquals("good", pool.getJSONObject(0).getString("id"));
    }
    @Test public void recentErrorsAreReducedInsteadOfRepeatedImmediately() throws Exception {
        JSONArray pool = new JSONArray().put(question("bad")).put(question("new")); JSONArray history = new JSONArray().put(attempt("1", "bad", false, 100));
        assertEquals("new", GuardQuestions.prioritize(pool, history, 1000, () -> .5).getJSONObject(0).getString("id"));
    }
    @Test public void historyDeduplicatesAndKeepsRealResultsInTimeOrder() throws Exception { JSONObject record = attempt("same", "a", false, 100); JSONArray history = GuardQuestions.history(new JSONArray().put(record), new JSONArray().put(record).put(attempt("other", "b", true, 200))); assertEquals(2, history.length()); assertFalse(history.getJSONObject(0).getBoolean("correct")); }
    @Test public void booleanAliasesAndFillNormalizationDoNotUnlockWrongAnswers() throws Exception { JSONObject q = question("bool").put("type", "boolean").put("answer", "错误"); assertTrue(GuardQuestions.correct(q, " false ")); assertFalse(GuardQuestions.correct(q, "正确")); assertFalse(GuardQuestions.correct(q, "unknown")); assertTrue(GuardQuestions.correct(question("fill"), " APPLE ")); }
    @Test public void juniorAndSeniorLabels() { assertEquals("初一", GuardQuestions.gradeLabel(7)); assertEquals("高三", GuardQuestions.gradeLabel(12)); }
}