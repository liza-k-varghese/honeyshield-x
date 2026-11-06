# Milestone 12 — Physical Android Device Acceptance & Verification

**Document:** `milestone12_physical_device_acceptance.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Status:** `NOT TESTED` (No physical Android handset attached via USB/Wi-Fi ADB)  

---

## 1. Truthful Environment Audit

During automated release engineering in the Parrot OS Linux environment:
- Physical USB Handset: None attached or detected in `lsusb` / ADB device registry.
- In strict adherence to HoneyShield X non-negotiable release integrity, physical device acceptance is truthfully classified as **`NOT TESTED`**.

## 2. Operator Physical Device Acceptance Runbook

To qualify `honeyshield-mobile-v1.0.0-rc5-debug.apk` on physical hardware:

1. **Enable Developer Options on Physical Device:**
   - Navigate to **Settings > About Phone** and tap **Build Number** 7 times.
   - In **Settings > System > Developer Options**, enable **USB Debugging** and **Install via USB**.

2. **Connect Device to Workstation:**
   ```bash
   adb devices
   # Expected output: <device_serial> device
   ```

3. **Sideload & Install APK:**
   ```bash
   adb install -r release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk
   ```

4. **Verify Hardware Capabilities:**
   - **Camera:** Open Pairing Scanner screen; confirm camera viewfinder initializes without crashes.
   - **Biometrics:** Trigger Governor Level-3 containment action; confirm biometric prompt (fingerprint or face) prompts operator.
   - **Push Notifications:** Send test push from Web SOC; verify arrival on `security-critical` or `security-alerts` channel.
   - **QR Pairing:** Scan desktop SOC QR code; confirm token single-use completion and dashboard transition.

