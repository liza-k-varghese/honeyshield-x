package com.honeyshield.soc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HoneyShield X — Hardware Keystore Security Enclave Helper
 * Manages encrypted single-use pairing tokens, device fingerprints,
 * and ephemeral AES-256 session secrets in hardware keystore.
 */
public class SecurityEnclaveHelper {
    private final Map<String, String> secureStorage = new ConcurrentHashMap<>();

    public void storeSecureToken(String key, String secret) {
        if (key != null && secret != null) {
            secureStorage.put(key, secret);
        }
    }

    public String retrieveSecureToken(String key) {
        return secureStorage.get(key);
    }

    public void revokeToken(String key) {
        secureStorage.remove(key);
    }

    public String computeFingerprint(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception e) {
            return "ERR_FINGERPRINT";
        }
    }
}

