# Milestone 11 — Release Artifacts & Cryptographic Manifest

**Release Candidate:** `v1.0.0-rc5`  
**Distribution Directory:** `/home/liza/HoneyShield-X/release/v1.0.0-rc5/`  

---

## 1. Verified Release Deliverables

| Artifact File | Size | SHA-256 Checksum |
|---|---|---|
| `honeyshield-frontend-v1.0.0-rc5.tar.gz` | ~225 KB | `60bff8331447493fbac98c462e4d8b493d5d77908d8e6a99fa3a421270f2adc4` |
| `index.html` | 0.99 KB | `03d3e004b101006fc3994e11795867a5ebbf01dd2cb7ca3d7de3dfcc86be569e` |
| `assets/index-DTM2Qike.css` | 76.67 KB | `3d410128c29fb8efb1eaff29d863b591d5a48d6502312c5e4d85c0b9bd6cbeea` |
| `assets/index-x_ehgSoK.js` | 920.93 KB | `1f0934677a03a6fa6d534fa7d286204ecf7988f9c587fdfb40463c0b3c17e994` |
| `RELEASE_MANIFEST.json` | 3.2 KB | Verified JSON format with Gates A through Q |
| `CHECKSUMS.sha256` | 124 B | Authoritative release bundle checksum |

## 2. Integrity Verification Command
To verify tarball integrity prior to staging or deployment:
```bash
sha256sum -c release/v1.0.0-rc5/CHECKSUMS.sha256
```

