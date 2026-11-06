# Milestone 12 — Android Emulator Acceptance & Operator Guide

**Document:** `milestone12_emulator_acceptance.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Status:** `NOT TESTED` (No active Android Virtual Device / emulator running on host)  

---

## 1. Truthful Environment Audit

During automated release engineering in the Parrot OS Linux environment:
- `adb` daemon: Not currently connected to any active Android virtual device.
- Emulators: Zero running Android Virtual Devices (AVD / QEMU) detected.
- In strict adherence to HoneyShield X non-negotiable release integrity, emulator acceptance is truthfully classified as **`NOT TESTED`**.

## 2. Operator Verification Runbook

Operators with an active Android Virtual Device (API 31 - 34) can execute acceptance verification using the following procedure:

1. **Start Emulator:**
   ```bash
   emulator -avd Pixel_7_API_34 -netdelay none -netspeed full &
   adb wait-for-device
   ```

2. **Install Built Debug APK:**
   ```bash
   adb install -r release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk
   ```

3. **Launch MainActivity:**
   ```bash
   adb shell am start -n com.honeyshield.soc/.MainActivity
   ```

4. **Verify Deep-Link Handlers:**
   ```bash
   # Test Pairing Intent
   adb shell am start -a android.intent.action.VIEW -d "honeyshield://pairing" com.honeyshield.soc

   # Test Alert Intent
   adb shell am start -a android.intent.action.VIEW -d "honeyshield://alert/101" com.honeyshield.soc
   ```

5. **Verify Logcat Output:**
   ```bash
   adb logcat -s HoneyShieldX:V DigitalAgentSyncService:V
   ```

