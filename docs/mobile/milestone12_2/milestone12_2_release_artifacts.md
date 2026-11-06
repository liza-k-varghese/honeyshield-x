# Milestone 12.2 — Release Artifacts & Checksums Audit

**Document:** `milestone12_2_release_artifacts.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Artifact Directory:** `release/v1.0.0-rc5/`  

---

## 1. Release Directory Contents & Forensic Classification

| File Name | Size (Bytes) | SHA-256 Digest | Status & Forensic Classification |
|---|---|---|---|
| `honeyshield-mobile-v1.0.0-rc5-debug.apk` | 60,416 | `149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2` | **`NOT A VALID MOBILE RELEASE BUILD`** (Minimal stub archive) |
| `honeyshield-mobile-v1.0.0-rc5-unsigned.apk`| 57,212 | `10228d447476b7e7169fef869019623da3747d2f440a322cbb54d8b671175653` | Pre-signature archive |
| `CHECKSUMS_MOBILE.sha256` | 134 | - | Matches debug APK hash |
| `honeyshield-frontend-v1.0.0-rc5.tar.gz` | 225,398 | - | Production Web frontend release tarball |
| `RELEASE_MANIFEST.json` | 3,110 | - | Unified release candidate manifest |

---

## 2. Release Signing & Distribution Requirements

- **Production Signing Credentials:** Not generated (in compliance with Part 3.4).
- **Production App Bundle (AAB):** Not generated.
- **Distribution:** Explicitly blocked pending operator toolchain provisioning and approval.

