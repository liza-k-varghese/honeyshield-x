# Milestone 12 — Android APK Build Engineering & Cryptographic Signing

**Document:** `milestone12_apk_build.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Build Script:** `scripts/build_mobile_apk.sh`  

---

## 1. Local APK Build Pipeline

The HoneyShield X Android application build pipeline operates completely locally on Parrot OS without requiring external cloud build services (e.g. EAS):

1. **Keystore Generation:**
   - Command: `keytool -genkeypair -v -keystore mobile/keystores/honeyshield-debug.keystore -alias honeyshield_debug -keyalg RSA -keysize 2048 -validity 10000 ...`
   - Algorithm: RSA-2048 with SHA-384/SHA-256 digest.
2. **Native Java Compilation:**
   - Classes: `MainActivity.java`, `HoneyShieldApplication.java`, `DigitalAgentSyncService.java`, `SecurityEnclaveHelper.java`, `GovernorContainmentBridge.java`.
   - Command: `javac --release 8 -Xlint:-options -d mobile/build_output/classes ...`
   - Output: `mobile/build_output/classes.jar`
3. **DEX Bytecode Generation:**
   - Tool: `/usr/bin/d2j-jar2dex` (Android DX Dalvik translation tool).
   - Command: `d2j-jar2dex -f -o mobile/build_output/apk_root/classes.dex mobile/build_output/classes.jar`
   - Output: `classes.dex` (Dalvik dex file version 035).
4. **React Native JavaScript Bundling:**
   - Tool: `esbuild 0.25.12`
   - Command: `esbuild mobile/index.js --bundle --minify --platform=neutral --packages=external --outfile=mobile/build_output/apk_root/assets/index.android.bundle`
   - Output: 177.3 KB minified bundle.
5. **Asset Staging & Packaging:**
   - Staged: `AndroidManifest.xml`, `assets/app.json`, `res/drawable/icon.png`, `res/drawable/splash.png`, `res/drawable/adaptive_icon.png`.
   - Tool: `zip -r -9 release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-unsigned.apk .`
6. **APK Signing & Verification:**
   - Tool: `jarsigner` (OpenJDK 25)
   - Signature: `jarsigner -sigalg SHA256withRSA -digestalg SHA-256 ...`
   - Verification: `jarsigner -verify release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk` -> **`jar verified.`**

## 2. Release Artifact Checksums

```
149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2  release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk
```
Saved to: `release/v1.0.0-rc5/CHECKSUMS_MOBILE.sha256`.

