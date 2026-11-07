# Milestone 17 — Android SDK & Toolchain Diagnostic Audit

## 1. Toolchain Inspection
A thorough audit of the Parrot OS build host identified the following native tooling state:
- **JDK / Java Compiler:** OpenJDK 21.0.6 (build 21.0.6+7-Debian-1)
- **Android SDK Directory:** Not present (`/home/liza/Android` absent, `ANDROID_HOME` unset)
- **AAPT / AAPT2:** Not installed (`aapt: command not found`, `apktool: command not found`)
- **ADB (Android Debug Bridge):** Not installed (`adb: command not found`)
- **Container Daemons:** `docker` and `podman` installed, but rootless daemon socket unavailable

## 2. Root Cause of Historical APK Packaging Failure
The historical build script `scripts/build_mobile_apk.sh` attempted to bypass standard Android resource compilation by copying raw plaintext `AndroidManifest.xml` into the APK root directory and packaging it with `zip` and `jarsigner`.
Without `aapt`/`aapt2`, `AndroidManifest.xml` was never transformed into compiled Android Binary XML (AXML), and the compiled string/resource table `resources.arsc` was omitted.

## 3. Toolchain Recovery Plan
To guarantee reproducible compilation without brittle hacks:
1. Provide a standard, compliant Android Gradle project structure in `mobile/android/`:
   - `settings.gradle`
   - root `build.gradle`
   - `app/build.gradle`
   - `gradle.properties`
   - standard layout `mobile/android/app/src/main/`
2. Define exact containerized execution commands for CI environments equipped with Android SDK platform-tools (`cimg/android:2024.01` or GitHub Actions `ubuntu-latest` with `setup-android`).

