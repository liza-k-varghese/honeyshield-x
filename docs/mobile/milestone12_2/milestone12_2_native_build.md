# Milestone 12.2 — Native Android Build Engineering & Toolchain Resolution

**Document:** `milestone12_2_native_build.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Host Architecture:** Parrot OS Linux, OpenJDK 25.0.4.1, Node.js 20.19.2  

---

## 1. Supported Native Build Toolchain Requirements

An authentic build of the HoneyShield X mobile application (`honeyshield-x-mobile`, Expo SDK 52, React Native 0.76.5) requires the following toolchain pipeline:

1. **Host Environment Prerequisites:**
   - Android SDK Platform 34 (`platforms/android-34/android.jar`).
   - Android SDK Build-Tools 34.0.0+ (`aapt2`, `d8`, `zipalign`, `apksigner`).
   - Gradle 8.8+ and Android Gradle Plugin 8.5.0+.
   - C++ NDK / CMake (or prebuilt React Native AARs).
   - Local `mobile/node_modules/` populated via package manager.

2. **Project Prebuild & Native Code Generation:**
   ```bash
   cd /home/liza/HoneyShield-X/mobile
   pnpm install
   npx expo prebuild --platform android --clean
   ```
   This generates the standard Android Gradle structure:
   - `mobile/android/build.gradle`
   - `mobile/android/app/build.gradle`
   - `mobile/android/settings.gradle`
   - `mobile/android/gradlew`
   - `mobile/android/app/src/main/AndroidManifest.xml` (valid XML template for aapt2)

3. **Authentic Gradle Compilation:**
   ```bash
   cd /home/liza/HoneyShield-X/mobile/android
   ./gradlew :app:assembleDebug
   ```
   Gradle compiles Java/Kotlin classes, links JNI shared libraries (`libhermes.so`, `libreactnativejni.so`), compiles resources into `resources.arsc` and binary AXML, and packages a genuine ~35-65 MB APK into `app/build/outputs/apk/debug/app-debug.apk`.

4. **Cryptographic Signing & Alignment:**
   ```bash
   zipalign -v -p 4 app-debug.apk app-aligned.apk
   apksigner sign --ks ../keystores/honeyshield-debug.keystore app-aligned.apk
   apksigner verify --verbose --print-certs app-aligned.apk
   ```

## 2. Current Toolchain Status on Workstation

- **Android SDK:** Missing on host.
- **Gradle:** Missing on host.
- **Dependencies:** Missing in `mobile/node_modules/`.
- In strict adherence to Part 2.3 and Part 3.2:
  - **No fabricated replacement archive has been generated.**
  - **No source code has been uploaded to external build services (EAS) without authorization.**
  - Native rebuild status is formally recorded as **`BLOCKED: TOOLCHAIN PROVISIONING REQUIRED`**.

