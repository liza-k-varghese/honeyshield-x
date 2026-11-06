# Milestone 12.1 — Native Build Requirements & Environment Gap Analysis

**Document:** `native_build_results.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Host Architecture:** Parrot OS Linux, OpenJDK 25.0.4.1, Node.js 20.19.2  

---

## 1. Toolchain & Environment Audit

To produce an authentic React Native 0.76+ / Expo SDK 52 Android application, the build system requires specific native tools and libraries. An audit of the local environment reveals:

| Required Component | Recommended / Standard Version | Local System Status | Impact on Build |
|---|---|---|---|
| **Android SDK Root (`ANDROID_HOME`)** | API Level 34 (`platforms/android-34`) | **ABSENT** (Directory not found on host) | Cannot link against Android framework APIs (`android.jar`) |
| **Android SDK Build-Tools** | `34.0.0` or `35.0.0` | **ABSENT** (`aapt`, `aapt2`, `d8`, `zipalign` missing) | Cannot compile AXML, compile resources, or generate multi-dex |
| **Android Platform-Tools** | `adb 34+` | **ABSENT** (`/usr/bin/adb` missing) | Cannot interface with emulators or physical handsets |
| **Gradle** | `8.8`+ | **ABSENT** (`gradle` missing; no `gradlew` wrapper generated) | Cannot execute standard Android Gradle Plugin build |
| **Android Gradle Plugin (AGP)** | `8.5.0`+ | **ABSENT** | Cannot execute `:app:assembleDebug` |
| **React Native Gradle Plugin** | `0.76.5` | **ABSENT** | Cannot orchestrate autolinking or C++ NDK build |
| **React Native C++ Prebuilts / AARs** | `com.facebook.react:react-android:0.76.5` | **ABSENT** | Missing `libreactnativejni.so`, `libhermes.so` |
| **Node.js Mobile Dependencies** | `mobile/node_modules/` | **ABSENT** (Dependencies not installed in `mobile/`) | Cannot run `npx expo prebuild` or Metro native bundler |

---

## 2. Supported Native Build Workflow Definition

When the operator provisions the standard Android toolchain, the authentic build execution order is:

1. **Dependency Installation:**
   ```bash
   cd mobile && pnpm install # or npm install
   ```

2. **Native Android Project Generation:**
   ```bash
   cd mobile && npx expo prebuild --platform android --clean
   # Generates:
   # mobile/android/build.gradle
   # mobile/android/app/build.gradle
   # mobile/android/settings.gradle
   # mobile/android/gradlew
   # mobile/android/app/src/main/AndroidManifest.xml
   ```

3. **Authentic Gradle Compilation:**
   ```bash
   cd mobile/android && ./gradlew :app:assembleDebug
   # Compiles Java/Kotlin classes
   # Links C++ shared libraries (libhermes.so, libreactnativejni.so)
   # Compiles resources.arsc and binary AXML via aapt2
   # Assembles full multi-dex classes.dex via D8
   # Produces mobile/android/app/build/outputs/apk/debug/app-debug.apk (~35-65 MB)
   ```

4. **Signing & Alignment:**
   ```bash
   zipalign -v -p 4 app-debug.apk app-aligned.apk
   apksigner sign --ks keystores/honeyshield-debug.keystore app-aligned.apk
   apksigner verify --verbose --print-certs app-aligned.apk
   ```

---

## 3. Status Verdict

Under the current sandboxed host environment without network access and without pre-installed Android SDK build tools, an authentic local native compilation is:
**`BLOCKED: MISSING ANDROID SDK AND GRADLE TOOLCHAIN`**.
In accordance with user directives, no fake, fabricated, or cloud-uploaded replacement has been generated.

