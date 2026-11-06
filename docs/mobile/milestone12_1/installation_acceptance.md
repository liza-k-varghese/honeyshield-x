# Milestone 12.1 — Installation Acceptance & Target Infrastructure Audit

**Document:** `installation_acceptance.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Audit Status:** **`NOT TESTED / BLOCKED`**  

---

## 1. Physical Device & Emulator Detection

During automated testing on the Parrot OS Linux workstation:
- **`adb` Executable:** Not installed in system PATH.
- **USB Device Bus (`lsusb`):** No attached Android mobile devices detected.
- **Running Virtual Devices:** No QEMU / AVD emulator processes active.
- **Target Infrastructure Classification:** **`NOT ATTACHED / NOT AVAILABLE`**.

---

## 2. Package Manager Rejection Analysis for Existing 60 KB APK

If `honeyshield-mobile-v1.0.0-rc5-debug.apk` were delivered to an Android device via `adb install`, the package would fail immediately at the operating system level:

```
$ adb install release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk
Performing Streamed Install
Failure [INSTALL_PARSE_FAILED_BAD_MANIFEST: Failed to parse /data/app/.../AndroidManifest.xml: Binary XML file not provided]
```

### Technical Root Causes for Failure:
1. **Uncompiled XML:** Android's internal `PackageParser` rejects plaintext XML; it strictly requires binary XML compiled via `aapt2`.
2. **Missing Application Subclass:** The manifest specifies `android:name="com.honeyshield.soc.HoneyShieldApplication"`. In `classes.dex`, `HoneyShieldApplication` is a plain Java class that does not extend `android.app.Application`.
3. **Missing Activity Subclass:** `MainActivity` does not extend `android.app.Activity` or `com.facebook.react.ReactActivity`. `ActivityManagerService` cannot instantiate or transition lifecycle states.
4. **Missing Signature Scheme v2/v3:** Signed only via JAR signing (v1). On modern Android versions (Android 11+, API 30+), APKs targeting API 30+ require APK Signature Scheme v2 or v3, which `apksigner` provides.

---

## 3. Acceptance Conclusion

In accordance with user directives:
- Installation testing cannot succeed on the stub APK.
- No physical handset or running emulator is attached.
- Installation acceptance is truthfully classified as **`NOT TESTED / BLOCKED`**.

