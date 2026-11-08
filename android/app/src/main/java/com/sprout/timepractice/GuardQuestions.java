package com.sprout.timepractice;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.function.DoubleSupplier;
import org.json.JSONArray;
import org.json.JSONObject;

/** Same weighted, without-replacement policy as the local web practice. */
final class GuardQuestions {
    private static final class Stats { int count, errors; long last; boolean lastWrong; }
    private static final class Ranked { JSONObject question; double rank; Ranked(JSONObject q, double r) { question = q; rank = r; } }
    static JSONArray enabled(JSONArray questions) throws Exception {
        JSONArray result = new JSONArray();
        for (int i = 0; i < questions.length(); i++) { JSONObject q = questions.getJSONObject(i); if (q.optBoolean("enabled", true)) result.put(q); }
        return result;
    }
    static JSONArray history(JSONArray initial, JSONArray nativeAttempts) throws Exception {
        HashMap<String, JSONObject> records = new HashMap<>();
        for (JSONArray source : new JSONArray[] { initial, nativeAttempts }) for (int i = 0; i < source.length(); i++) {
            JSONObject attempt = source.getJSONObject(i); if (!attempt.optString("id").isEmpty()) records.put(attempt.getString("id"), attempt);
        }
        ArrayList<JSONObject> sorted = new ArrayList<>(records.values()); sorted.sort(Comparator.comparingLong(a -> a.optLong("at")));
        JSONArray result = new JSONArray(); for (int i = Math.max(0, sorted.size() - 10000); i < sorted.size(); i++) result.put(sorted.get(i)); return result;
    }
    static JSONArray prioritize(JSONArray questions, JSONArray attempts, long now, DoubleSupplier random) throws Exception {
        HashMap<String, Stats> stats = new HashMap<>(); ArrayList<JSONObject> sorted = new ArrayList<>();
        for (int i = 0; i < attempts.length(); i++) {
            JSONObject a = attempts.getJSONObject(i); String id = a.optString("questionId"); Stats s = stats.computeIfAbsent(id, key -> new Stats());
            s.count++; if (!a.optBoolean("correct")) s.errors++;
            if (a.optLong("at") >= s.last) { s.last = a.optLong("at"); s.lastWrong = !a.optBoolean("correct"); } sorted.add(a);
        }
        sorted.sort((a, b) -> Long.compare(b.optLong("at"), a.optLong("at")));
        HashSet<String> recent = new HashSet<>(); for (int i = 0; i < Math.min(5, sorted.size()); i++) recent.add(sorted.get(i).optString("questionId"));
        ArrayList<Ranked> ranked = new ArrayList<>();
        for (int i = 0; i < questions.length(); i++) {
            JSONObject q = questions.getJSONObject(i); if (!q.optBoolean("enabled", true)) continue;
            Stats s = stats.get(q.optString("id"));
            double weight = s == null ? 8 : 1 + s.errors / (double) s.count * 8 + (s.lastWrong ? 3 : 0) + Math.min(2, Math.max(0, now - s.last) / 86400000.0);
            if (recent.contains(q.optString("id"))) weight *= .15;
            ranked.add(new Ranked(q, -Math.log(Math.max(Math.ulp(1.0), random.getAsDouble())) / weight));
        }
        ranked.sort(Comparator.comparingDouble(row -> row.rank)); JSONArray result = new JSONArray(); for (Ranked row : ranked) result.put(row.question); return result;
    }
    static boolean booleanType(JSONObject q) { return "boolean".equals(q.optString("type")) || "判断题".equals(q.optString("type")); }
    static String booleanAnswer(String answer) {
        String value = GuardService.normalize(answer);
        if (java.util.Arrays.asList("正确", "对", "是", "true", "1", "√").contains(value)) return "正确";
        if (java.util.Arrays.asList("错误", "错", "否", "false", "0", "×").contains(value)) return "错误";
        return "";
    }
    static boolean correct(JSONObject q, String answer) throws Exception { return booleanType(q) ? !booleanAnswer(answer).isEmpty() && booleanAnswer(answer).equals(booleanAnswer(q.getString("answer"))) : GuardService.normalize(answer).equals(GuardService.normalize(q.getString("answer"))); }
    static String gradeLabel(int grade) { return grade <= 6 ? grade + " 年级" : grade <= 9 ? new String[] { "初一", "初二", "初三" }[grade - 7] : new String[] { "高一", "高二", "高三" }[grade - 10]; }
}