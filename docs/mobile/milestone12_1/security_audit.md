# Milestone 12.1 — Mobile Security & Operational Governance Audit

**Document:** `security_audit.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Mobile Platform Security Findings

1. **Android Permission Posture:**
   - Permissions declared in `app.json` and `mobile/android/AndroidManifest.xml`:
     - `INTERNET`, `ACCESS_NETWORK_STATE`: Strictly required for REST/WebSocket/SSE telemetry.
     - `POST_NOTIFICATIONS`: Android 13+ runtime permission for SOC alerts.
     - `CAMERA`: Required for QR device pairing scanner.
     - `USE_BIOMETRIC`, `USE_FINGERPRINT`: Required for Governor Level-3 step-up authorization.
   - Permissions are scoped and minimal; no dangerous background location or external storage permissions requested.

2. **Network Security Configuration:**
   - `android:usesCleartextTraffic="false"` is declared in the manifest template.
   - All network calls default to TLS 1.3 encrypted HTTPS / WSS transports.

3. **QR Device Pairing Protocol Security:**
   - Single-use challenge token validated in database upon retrieval.
   - Enforces 180s strict TTL.
   - Requires Administrator step-up authorization before issuance.
   - Binds device fingerprint (cryptographic hash of hardware salt).

4. **Governor Level-3 Authorization Boundaries:**
   - Level-3 containment actions (host isolation, IP blocking) enforce:
     1. Operator confirmation modal review.
     2. Mandatory minimum 10-character operational justification.
     3. Biometric challenge.
     4. Dry-run simulation mode.
     5. Immutable PostgreSQL audit event logging.

