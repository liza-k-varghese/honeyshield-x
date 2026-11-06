# Milestone 14 — Android Native Release Authenticity & Build Review

**Document ID:** `HSX-DOC-M14-015`  
**Classification:** Mobile Engineering & Supply-Chain Audit  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Forensic Audit of Existing Mobile Artifacts

The repository contains an existing mobile package at `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk` (60,416 bytes, SHA-256 `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2`).

### Archive Structural Deconstruction:
| File Inside Archive | Type / Content | Expected Android Standard | Forensic Verdict |
|:---|:---|:---|:---:|
| `AndroidManifest.xml` | Raw UTF-8 plaintext XML | Android Binary XML (AXML) | **FAIL** (Cannot be parsed by Android OS) |
| `classes.dex` | 5,124 bytes (minimal stub) | Multi-MB DEX bytecode with React Native | **FAIL** (Missing React Native framework classes) |
| `resources.arsc` | **ABSENT** | Compiled binary resource table | **FAIL** (Mandatory package table missing) |
| `lib/arm64-v8a/*.so` | **ABSENT** | Native C++ runtime (`libreactnativejni.so`, `libhermes.so`) | **FAIL** (No native JavaScript engine) |
| `META-INF/CERT.RSA` | Valid PKCS#7 signature | Valid cryptographic signature | **PASS** (Archive is signed, but unexecutable) |

---

## 2. Root Cause Analysis & Toolchain Verification

1. **Root Cause:** The artifact was generated using an ad-hoc packaging script (`scripts/build_mobile_apk.sh`) that zipped raw source files and signed the resulting archive using `jarsigner` rather than invoking the official Android Gradle Plugin (`./gradlew assembleRelease` / `aapt2` / `d8`).
2. **Host Environment Gaps:**
   - Host `which adb` reports absent.
   - Android SDK Platform 34 (`android.jar`) is not installed on the Parrot OS host.
   - Gradle wrapper and Android Build-Tools (`aapt2`, `d8`, `zipalign`) are absent.
3. **Verdict:** In strict adherence to Stop Condition 38.2 (**NO FAKE ANDROID ARTIFACTS**), the artifact is classified as **`FAILED / BLOCKED FROM RELEASE`**.

---

## 3. Build Reconstruction Requirements

To produce a genuine, executable React Native Android APK:
1. Provision a Linux CI runner with OpenJDK 17+, Android SDK Platform 34, Android Build-Tools 34.0.0, and Gradle 8+.
2. Execute `cd mobile/android && ./gradlew assembleRelease`.
3. Output expected file size: $\sim 45\text{ MB} - 75\text{ MB}$ (containing Hermes engine and React Native C++ libraries).
4. Verify installation on physical device via `adb install -r`.

