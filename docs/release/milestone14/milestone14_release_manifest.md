# Milestone 14 — Release Manifest, Artifact Provenance & Checksums

**Document ID:** `HSX-DOC-M14-031`  
**Classification:** Release Engineering & Supply Chain Integrity  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  
**Evaluated Git Commit:** `7ad33c6`  

---

## 1. Release Inventory & Cryptographic Checksums

| Artifact Identifier | File Path | Size (Bytes) | SHA-256 Checksum | Release Status |
|:---|:---|:---:|:---|:---:|
| **Web SOC Distribution** | `release/v1.0.0-rc5/honeyshield-frontend-v1.0.0-rc5.tar.gz` | 4,218,892 | Verified via Vite build manifest | **QUALIFIED FOR STAGING** |
| **Backend Service Bundle** | `backend/app/` | Source tree | Commit `7ad33c6` | **QUALIFIED FOR STAGING** |
| **Mobile Debug APK** | `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-debug.apk` | 60,416 | `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2` | **REJECTED (UNEXECUTABLE STUB)** |
| **Mobile Unsigned APK** | `release/v1.0.0-rc5/honeyshield-mobile-v1.0.0-rc5-unsigned.apk` | 57,212 | `6022e3ad596c5aa040a4cf0251756543b3531bcfcbbd7bcffcfc9dbb1c60ad6c` | **REJECTED (STUB ARCHIVE)** |

---

## 2. Supply Chain & Traceability Attestation

- All artifacts in `release/v1.0.0-rc5/` originate from commit `7ad33c6`.
- Web SOC distribution tarball is verified free of development dependencies and test mocks.
- The Android APK artifact is strictly quarantined due to absence of compiled binary AXML and native C++ shared libraries.
- No public artifact distribution or container registry push has been performed.

