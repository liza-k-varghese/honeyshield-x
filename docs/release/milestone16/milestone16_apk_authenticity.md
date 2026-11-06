# Milestone 16 — Android APK Authenticity & Structural Forensic Audit

**Project:** HoneyShield X — Unified Cybersecurity Operations  
**Subsystem:** Android Mobile Security Operations Companion  
**Milestone:** 16  
**Evaluation Date:** 2026-11-06  

---

## 1. Candidate Artifacts & Structural Dissection

An earlier milestone reported a debug APK of size 57,457 bytes:
- Candidate Path: `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk`
- Unsigned Path: `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-unsigned.apk`
- SHA-256 Checksum: `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2`

Structural dissection via archive inspection reveals the following contents:
```
  Length      Date    Time    Name
---------  ---------- -----   ----
      706  2026-11-06 06:57   META-INF/MANIFEST.MF
      868  2026-11-06 06:57   META-INF/HONEYSHI.SF
     1574  2026-11-06 06:57   META-INF/HONEYSHI.RSA
        0  2026-11-06 06:57   assets/
   181534  2026-11-06 06:57   assets/index.android.bundle
     1368  2026-11-06 06:57   assets/app.json
        0  2026-11-06 06:56   res/
        0  2026-11-06 06:57   res/drawable/
    12466  2026-11-06 06:57   res/drawable/splash.png
     2325  2026-11-06 06:57   res/drawable/icon.png
     2325  2026-11-06 06:57   res/drawable/adaptive_icon.png
     8580  2026-11-06 06:57   classes.dex
     2961  2026-11-06 06:57   AndroidManifest.xml
```

---

## 2. Forensic Finding: Uncompiled Text AndroidManifest

The audit establishes that:
1. **Source Code & JS Bundle Are Genuine:** `classes.dex` contains the compiled Java classes (`MainActivity`, `HoneyShieldApplication`, `GovernorContainmentBridge`, `DigitalAgentSyncService`), and `assets/index.android.bundle` contains 181 KB of compiled React Native TypeScript application logic.
2. **Missing Binary AXML & Resources.arsc:** Because the Parrot OS host lacks `aapt` (Android Asset Packaging Tool), the build script (`scripts/build_mobile_apk.sh`) packaged raw text `AndroidManifest.xml` rather than binary compiled AXML, and omitted `resources.arsc`.
3. **Execution Consequence:** When standard Android OS `PackageManager` attempts to parse this archive during `adb install`, Android's `PackageParser` will fail with an XML parse exception because it expects binary AXML.
4. **Classification:** **INVALID FOR DIRECT ANDROID OS INSTALLATION**. While the Java and JS contents are genuine and free of malicious implants, the package structure is incomplete.

