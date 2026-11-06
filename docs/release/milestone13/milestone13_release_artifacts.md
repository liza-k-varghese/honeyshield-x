# Milestone 13 — Release Artifacts, Manifests & Checksums

**Document ID:** `HSX-DOC-M13-024`  
**Classification:** Release Management & Supply Chain Integrity  
**Release Candidate:** `v1.0.0-rc5`  
**Artifact Directory:** `release/v1.0.0-rc5/`

---

## 1. Release Inventory & Cryptographic Checksums

The table below lists all build artifacts evaluated under Milestone 13, their SHA-256 digests, file sizes, and release qualification statuses:

| Artifact Name | Relative Path | Size (Bytes) | SHA-256 Digest | Qualification Status |
|:---|:---|:---:|:---|:---:|
| **Mobile Debug APK** | `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk` | 60,416 | `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2` | **REJECTED (NOT A VALID APK)** |
| **Mobile Unsigned APK** | `mobile/android/app/build/outputs/apk/release/app-release-unsigned.apk` | 57,212 | `6022e3ad596c5aa040a4cf0251756543b3531bcfcbbd7bcffcfc9dbb1c60ad6c` | **REJECTED (STUB ARCHIVE)** |
| **Web SOC Distribution** | `frontend/dist/` (Tarball archive) | 4,218,892 | Verified via Vite build manifest | **QUALIFIED / READY** |
| **Backend Wheel / App** | `backend/app/` | Source bundle | Synchronized with git commit | **QUALIFIED / READY** |

---

## 2. Supply Chain & Provenance Audit

1. **Android Packaging Anomaly:**
   Forensic analysis in `milestone13_android_apk_verification.md` determined that `honeyshield-mobile-v1.0.0-rc5-debug.apk` was generated from a synthetic ZIP packaging script rather than the official Android Gradle Plugin (`assembleRelease` / `bundleRelease`).
   - Binary `resources.arsc` table: **ABSENT**.
   - React Native C++ native `.so` libraries (`libreactnativejni.so`, `libhermes.so`): **ABSENT**.
   - Binary AXML manifest: **ABSENT** (Contains UTF-8 plaintext XML).
   - In accordance with Part 32 Stop Conditions, this package is explicitly quarantined and labeled `NOT A VALID MOBILE RELEASE BUILD`.
2. **Web SOC Distribution:**
   Built directly with `vite build`, producing code-split chunks, content-hashed asset files, and zero runtime dev dependencies.
3. **Reproducibility:**
   All builds utilize pinned `package-lock.json` and `backend/requirements.txt` dependencies.

