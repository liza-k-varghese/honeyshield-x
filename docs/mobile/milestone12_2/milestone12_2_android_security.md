# Milestone 12.2 — Mobile Android Platform Security & Hardening

**Document:** `milestone12_2_android_security.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Security Invariants Audit

1. **Manifest Hardening:**
   - `android:allowBackup="false"`: Disables ADB backup to prevent physical token exfiltration.
   - `android:usesCleartextTraffic="false"`: Rejects plain-text HTTP connections across the entire application runtime.
   - `android:exported="false"`: Applied to internal services (`DigitalAgentSyncService`) to prevent unauthorized IPC invocation.
2. **Credential Storage:**
   - JWT tokens stored in hardware-backed Android KeyStore via `expo-secure-store`.
   - Never logged to console or stored in unencrypted `AsyncStorage`.
3. **Deep-Link Validation:**
   - Intent filters strictly bound to `scheme="honeyshield"`.
   - Deep-link parameters are not trusted for authorization; backend verifies operator privileges on retrieval.

