# Milestone 12.1 — Android APK Structure & Forensic Audit

**Document:** `apk_structure_audit.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Audited Artifact:** `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk`  
**SHA-256 Digest:** `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2`  
**File Size:** `60,416 bytes` (compressed), `214,707 bytes` (uncompressed)  
**Audit Classification:** **`NOT A VALID MOBILE RELEASE BUILD`**  

---

## 1. Forensic Archive Listing

Disassembly and archive inspection via `unzip -l` and `zipinfo` reveals exactly 13 entries:

| Entry Name | Length (Bytes) | Nature / Format |
|---|---|---|
| `META-INF/MANIFEST.MF` | 706 | JAR signature manifest |
| `META-INF/HONEYSHI.SF` | 868 | Signature file |
| `META-INF/HONEYSHI.RSA` | 1,574 | PKCS#7 signature block (RSA-2048) |
| `assets/` | 0 | Directory |
| `assets/index.android.bundle` | 181,534 | esbuild JavaScript bundle (`--packages=external`) |
| `assets/app.json` | 1,368 | Expo project metadata JSON |
| `res/` | 0 | Directory |
| `res/drawable/` | 0 | Directory |
| `res/drawable/splash.png` | 12,466 | Splash image asset |
| `res/drawable/icon.png` | 2,325 | App icon asset |
| `res/drawable/adaptive_icon.png` | 2,325 | Adaptive icon asset |
| `classes.dex` | 8,580 | Dalvik Executable (DEX version 035) |
| `AndroidManifest.xml` | 2,961 | Plaintext UTF-8 XML (uncompiled) |

---

## 2. Critical Structural Deficits Identified

### Deficit 1: Plaintext Uncompiled `AndroidManifest.xml`
- **Observed:** The manifest within the APK is raw, human-readable UTF-8 XML.
- **Android OS Requirement:** Android requires `AndroidManifest.xml` to be pre-compiled into Android Binary XML (AXML) by `aapt`/`aapt2`.
- **Failure Mode:** On any standard Android device or emulator, `PackageManagerService` parses manifests using `AxmlParser`. Encountering plaintext XML triggers `android.content.pm.PackageParser$PackageParserException: Failed to parse AndroidManifest.xml` (`INSTALL_PARSE_FAILED_BAD_MANIFEST`).

### Deficit 2: Absence of React Native C++ Native Shared Libraries
- **Observed:** The APK contains zero `.so` native shared libraries. The `lib/` directory is entirely missing.
- **Android OS Requirement:** React Native 0.76+ architecture requires native ABI-specific shared libraries (`lib/arm64-v8a/`, `lib/armeabi-v7a/`, `lib/x86_64/`):
  - `libreactnativejni.so` (React Native JNI bridge)
  - `libhermes.so` or `libjsc.so` (JavaScript engine runtime)
  - `libfbjni.so` (Facebook JNI helper)
  - `libturbomodulejsinstaller.so`
- **Failure Mode:** Even if the package could be unpacked, the process crashes immediately upon class loading with `java.lang.UnsatisfiedLinkError: Couldn't load reactnativejni`.

### Deficit 3: Incomplete Classes in `classes.dex` (Baksmali Analysis)
Disassembly of `classes.dex` via `/usr/bin/d2j-dex2smali` revealed only 7 classes from 5 custom Java files:
- `com.honeyshield.soc.MainActivity`
- `com.honeyshield.soc.HoneyShieldApplication`
- `com.honeyshield.soc.DigitalAgentSyncService`
- `com.honeyshield.soc.DigitalAgentSyncService$AgentRole`
- `com.honeyshield.soc.SecurityEnclaveHelper`
- `com.honeyshield.soc.GovernorContainmentBridge`
- `com.honeyshield.soc.GovernorContainmentBridge$ContainmentResult`

**Missing Core Classes:**
- `com.facebook.react.ReactActivity`
- `com.facebook.react.ReactApplication`
- `com.facebook.react.bridge.*`
- `com.facebook.react.modules.*`
- `expo.modules.core.*`
- `android.app.Activity` inheritance (the current `MainActivity` does not extend `android.app.Activity` or `ReactActivity`).

### Deficit 4: Missing Compiled Resource Table (`resources.arsc`)
- **Observed:** No `resources.arsc` file exists in the archive root.
- **Android OS Requirement:** Android's asset and theme subsystem maps integer resource IDs (`R.drawable.icon`, `R.string.app_name`, `R.style.Theme_DeviceDefault_NoActionBar`) through `resources.arsc`.
- **Failure Mode:** The Android runtime cannot resolve themes or drawables declared in the manifest.

### Deficit 5: External Dependencies Unresolved in JavaScript Bundle
- **Observed:** The bundle at `assets/index.android.bundle` was generated using `esbuild mobile/index.js --bundle --minify --platform=neutral --packages=external`.
- **Failure Mode:** Bare module specifiers (`react`, `react-native`, `expo`, `@react-navigation/*`, `zustand`) were marked as external. When executed by a JavaScript runtime without a Node-style filesystem resolver, execution throws `ReferenceError: require is not defined` or cannot find module.

---

## 3. Forensic Conclusion

The reported `honeyshield-mobile-v1.0.0-rc5-debug.apk` is a custom assembled minimal archive (a stub artifact). It is **`NOT A VALID MOBILE RELEASE BUILD`** and cannot be installed, launched, or executed on real Android hardware or emulators.

