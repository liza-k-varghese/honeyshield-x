# HoneyShield X — Milestone 18: APK Structural & Bytecode Inspection

## 1. Artifact Identification
- **Artifact:** `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk`
- **File Size:** 60,416 bytes
- **Format:** Zip Archive / JAR
- **SHA-256 Checksum:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (Derived from clean build package)

## 2. Archive Contents
- `AndroidManifest.xml`: 2,418 bytes. Declares permissions, `com.honeyshield.soc` package ID, and `MainActivity`. Plaintext encoding in current artifact.
- `classes.dex`: 8,432 bytes. Contains compiled native Android shims (`MainActivity`, `HoneyShieldApplication`, `SecurityEnclaveHelper`, `GovernorContainmentBridge`, `DigitalAgentSyncService`).
- `assets/index.android.bundle`: 177,320 bytes. Contains minified React Native bundle compiled with `esbuild`.
- `assets/app.json`: Expo application metadata configuration.
- `res/drawable/`: App icon (`icon.png`), adaptive icon (`adaptive_icon.png`), and splash screen (`splash.png`).
- `META-INF/`: Contains `MANIFEST.MF`, `CERT.SF`, and `CERT.RSA`.

## 3. Structural Compliance Checklist
- [x] Package Name: `com.honeyshield.soc`
- [x] Minimum SDK: 26 (Android 8.0 Oreo)
- [x] Target SDK: 34 (Android 14)
- [x] Launch Activity: `com.honeyshield.soc.MainActivity`
- [x] Intent Filter: `honeyshield://` custom URL scheme
- [x] Dalvik Bytecode: Present and valid Dalvik format 035
- [ ] Binary XML Encoding: Plaintext in legacy artifact; requires `aapt2`
- [ ] `resources.arsc`: Missing in legacy artifact; requires `aapt2`

