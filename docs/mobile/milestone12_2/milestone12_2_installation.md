# Milestone 12.2 — APK Installation Acceptance & Operator Runbook

**Document:** `milestone12_2_installation.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Installation Status:** **`NOT TESTED / BLOCKED`**  

---

## 1. Installation Status Justification

Installation of the existing 60 KB APK is blocked due to internal structural defects:
- Missing Android Binary XML (AXML): `PackageManagerService` will abort with `INSTALL_PARSE_FAILED_BAD_MANIFEST`.
- Missing `.so` runtime shared libraries: Native linker throws `UnsatisfiedLinkError`.

Furthermore, no Android test handset or running emulator is connected to the host machine.

---

## 2. Operator-Assisted Installation Procedure (For Authorized Device)

When an authentic APK is built and an authorized test device is attached, the operator executes the following verification runbook:

### Step 1: Confirm ADB Connectivity
```bash
adb devices -l
# Expected output:
# <device_serial> device usb:1-1 product:<model> model:<model> device:<device>
```

### Step 2: Sideload APK Archive
```bash
adb install -r -d release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk
# Expected output:
# Performing Streamed Install
# Success
```

### Step 3: Verify Package Enrollment in PackageManager
```bash
adb shell pm list packages | grep honeyshield
# Expected output:
# package:com.honeyshield.soc
```

### Step 4: Launch Main Entrypoint Activity
```bash
adb shell am start -n com.honeyshield.soc/.MainActivity
# Expected output:
# Starting: Intent { cmp=com.honeyshield.soc/.MainActivity }
```

### Step 5: Capture Sanitized Runtime Diagnostics
```bash
adb logcat -s HoneyShieldX:V ReactNative:V ReactNativeJS:V
```

