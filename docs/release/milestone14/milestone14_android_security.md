# Milestone 14 — Android Application Security & Hardware Keystore Integration

**Document ID:** `HSX-DOC-M14-017`  
**Classification:** Mobile Application Security Architecture  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Mobile Storage Architecture & Token Encryption

The HoneyShield X Android application (`mobile/`) implements cryptographic defense-in-depth for locally persisted operator secrets:

```
                  Mobile Application Sandbox
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
       Android KeyStore            EncryptedSharedPreferences
     (Hardware Security Module)      (AES-256-GCM Encrypted)
     - Private RSA Keypair           - Stored Device Scoped JWT
     - Biometric Auth Keys           - Refresh Token Fingerprint
```

- **Zero Plaintext Credentials:** JWT bearer tokens, device pairing secrets, and server URLs are encrypted at rest using `EncryptedSharedPreferences` backed by the Android Hardware KeyStore (HSM).
- **No Insecure Storage:** Unencrypted `AsyncStorage` or external SD storage is strictly prohibited for sensitive operational data.

---

## 2. Network Security Configuration & Certificate Pinning

1. **Cleartext Traffic Rejection:** `android:usesCleartextTraffic="false"` enforced in `AndroidManifest.xml`. All network communication requires HTTPS (TLS 1.3).
2. **Strict CORS & Hostname Verification:** API client (`mobile/src/services/apiClient.ts`) verifies server TLS certificate chains against the system CA store or custom enterprise root CAs.
3. **Session Auto-Purge on Revocation:** When the server emits an `HSX-AUTH-REVOKED` termination signal, the mobile client immediately deletes all encrypted key material and routes to the unauthenticated login screen.

---

## 3. OWASP Mobile Top 10 Verification

| OWASP Mobile Risk | Applied HoneyShield X Defense | Status |
|:---|:---|:---:|
| **M1: Improper Credential Usage** | Short-lived JWTs (15 min); single-use QR pairing tokens | **PASS** |
| **M2: Inadequate Supply Chain** | Pinned dependencies in `package-lock.json` | **PASS** |
| **M3: Insecure Authentication** | Biometric step-up; hardware-backed keystore tokens | **PASS** |
| **M4: Insufficient Input Validation**| Strict TypeScript schema validation on incoming events | **PASS** |
| **M5: Insecure Communication** | TLS 1.3 only; cleartext traffic disabled | **PASS** |
| **M6: Inadequate Privacy Controls**| Lock-screen notification redaction; no PII in logs | **PASS** |
| **M7: Insufficient Binary Protection**| ProGuard / R8 minification and obfuscation configured | **PASS** |
| **M8: Security Misconfiguration** | Debug flags disabled in release manifests | **PASS** |

