# Milestone 12 — Mobile Android Platform Security & Hardening

**Document:** `milestone12_android_security.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Android Manifest Hardening

The mobile `AndroidManifest.xml` enforces enterprise application security standards:
- `android:allowBackup="false"`: Disables ADB backup to prevent extraction of application state via physical debug bridges.
- `android:usesCleartextTraffic="false"`: Rejects all plain-text HTTP connections across the entire application runtime; all network communication is strictly forced over TLS 1.3.
- `android:exported="false"` for internal components: Background services such as `DigitalAgentSyncService` are non-exported, preventing unauthorized external invocation by other Android applications on the device.
- Intent filters for deep links are restricted strictly to `scheme="honeyshield"` and defined host targets.

## 2. Cryptographic & Device Binding Invariants

- Device keys generated in Android Keystore are hardware-backed (StrongBox or TEE where supported).
- Keystore keys are configured with `setUserAuthenticationRequired(true)` for sensitive Governor signing operations.
- App tampering and rooted environment checks warn operators if execution occurs on compromised firmware.

