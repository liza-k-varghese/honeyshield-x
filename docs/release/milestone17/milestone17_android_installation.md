# HoneyShield X — Milestone 17: Android Installation Analysis & Blocker Diagnosis

## 1. Operational Overview
This document evaluates the installation mechanics of HoneyShield X mobile application packages on Android devices and emulators.

## 2. Root Cause Analysis of Installation Failures
1. **Plaintext Manifest (`AndroidManifest.xml`):**
   Standard Android runtimes require binary-encoded XML (AXML) compiled with `aapt2`. The packaging script `scripts/build_mobile_apk.sh` packaged a raw UTF-8 plaintext manifest into the APK root.
2. **Missing Compiled Resources (`resources.arsc`):**
   Android `PackageParser` mandates a compiled resource table (`resources.arsc`) to map application icons, theme styles, string definitions, and layout references. Without `resources.arsc`, `PackageParser.collectCertificates` and resource linking abort with `INSTALL_PARSE_FAILED_NOT_APK` or `INSTALL_PARSE_FAILED_UNEXPECTED_EXCEPTION`.
3. **Absence of Host Android Build-Tools:**
   The host Parrot OS environment does not contain Android SDK Build-Tools (specifically `aapt2`, `d8`/`dx`, or `android.jar`).

## 3. Standardization via Native Gradle Layout
To rectify this without modifying production application contracts or fabricating build success:
- Directory structure `mobile/android/` restructured to standard Android Gradle hierarchy:
  - `mobile/android/settings.gradle`
  - `mobile/android/build.gradle` (root project with Google & MavenCentral repositories)
  - `mobile/android/gradle.properties`
  - `mobile/android/gradle/wrapper/gradle-wrapper.properties`
  - `mobile/android/app/build.gradle` (declares `compileSdkVersion 34`, `minSdkVersion 26`, dependencies)
  - `mobile/android/app/src/main/AndroidManifest.xml`
  - `mobile/android/app/src/main/java/com/honeyshield/soc/`
  - `mobile/android/app/src/main/res/values/` (`strings.xml`, `styles.xml`)
- In any CI/CD environment with Android SDK build-tools installed (`ANDROID_HOME`), running `./gradlew :app:assembleDebug` will generate a valid binary AXML and `resources.arsc`.

## 4. Hardware and Emulator Pilot Status
- Physical device testing: **NOT TESTED / BLOCKED** (No connected physical device or ADB daemon on host).
- Android emulator testing: **NOT TESTED / BLOCKED** (No AVD or hardware virtualization on containerized agent).
- Adherence to Part 35: Zero fabrication of physical test results.

