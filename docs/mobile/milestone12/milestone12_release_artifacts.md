# Milestone 12 — Mobile Release Artifacts & Cryptographic Verification

**Document:** `milestone12_release_artifacts.md`  
**Target Release Candidate:** `v1.0.0-rc5`  
**Artifact Directory:** `release/v1.0.0-rc5/`  

---

## 1. Verified Release Artifacts

| File Name | File Size | Description | Cryptographic Integrity |
|---|---|---|---|
| `honeyshield-mobile-v1.0.0-rc5-debug.apk` | 60,416 bytes | Genuine Android APK package signed with RSA-2048 SHA-256 certificate | Signed (`jar verified.`) |
| `honeyshield-mobile-v1.0.0-rc5-unsigned.apk`| 57,212 bytes | Unsigned intermediate Android APK package | Pre-signature archive |
| `CHECKSUMS_MOBILE.sha256` | 134 bytes | Canonical SHA-256 digest of signed APK package | Validated |
| `honeyshield-frontend-v1.0.0-rc5.tar.gz` | 225,398 bytes | Production Web frontend release tarball | Pre-existing certified archive |
| `RELEASE_MANIFEST.json` | 3,110 bytes | Unified multi-platform release candidate manifest | Synchronized |

## 2. Checksum Verification

```
149be32f18df3436a26b8b88a748ae4b1282cf885760bf68fb2ae43bf0de38f2  honeyshield-mobile-v1.0.0-rc5-debug.apk
```

