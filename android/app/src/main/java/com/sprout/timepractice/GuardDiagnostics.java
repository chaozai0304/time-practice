package com.sprout.timepractice;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/** Operational events only: never log a PIN, credential, question or answer. */
final class GuardDiagnostics {
    private GuardDiagnostics() {}
    static synchronized void record(Context context, String event, String detail) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(GuardService.PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(prefs.getString("diagnostics", "[]")), next = new JSONArray();
            for (int i = Math.max(0, old.length() - 39); i < old.length(); i++) next.put(old.get(i));
            next.put(new JSONObject().put("at", System.currentTimeMillis()).put("event", event).put("detail", detail));
            prefs.edit().putString("diagnostics", next.toString()).apply();
        } catch (Exception ignored) { /* Diagnostics must not interrupt parenting controls. */ }
    }
}