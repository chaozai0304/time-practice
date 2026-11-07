package com.sprout.timepractice;

import android.content.SharedPreferences;
import java.security.MessageDigest;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.json.JSONObject;

final class GuardAuth {
    private GuardAuth() {}

    // Shared by the native overlay and bridge, including a persistent rate limit.
    static synchronized boolean verify(String pin, JSONObject credential, SharedPreferences prefs) throws Exception {
        long now = android.os.SystemClock.elapsedRealtime();
        if (now < prefs.getLong("blockedUntilElapsed", 0)) throw new Exception("尝试次数过多，请 30 秒后再试");
        boolean valid = matches(pin, credential);
        if (valid) {
            prefs.edit().putInt("failures", 0).putLong("blockedUntilElapsed", 0).apply();
        } else {
            int count = prefs.getInt("failures", 0) + 1;
            prefs.edit().putInt("failures", count >= 5 ? 0 : count)
                .putLong("blockedUntilElapsed", count >= 5 ? now + 30_000 : 0).apply();
        }
        return valid;
    }

    static boolean matches(String pin, JSONObject credential) throws Exception {
        if (pin == null || !pin.matches("[0-9]{6}") || credential == null) return false;
        String saltHex = credential.getString("salt");
        int iterations = credential.getInt("iterations");
        if (!saltHex.matches("[0-9a-f]{32}") || iterations != 120_000) return false;
        byte[] salt = decodeHex(saltHex);
        PBEKeySpec spec = new PBEKeySpec(pin.toCharArray(), salt, iterations, 256);
        byte[] hash;
        try { hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        finally { spec.clearPassword(); }
        return MessageDigest.isEqual(hash, decodeHex(credential.getString("hash")));
    }

    private static byte[] decodeHex(String value) {
        if (value == null || value.length() % 2 != 0 || !value.matches("[0-9a-f]+")) return new byte[0];
        byte[] result = new byte[value.length() / 2];
        for (int i = 0; i < result.length; i++) result[i] = (byte) Integer.parseInt(value.substring(i * 2, i * 2 + 2), 16);
        return result;
    }
}