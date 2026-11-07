# HoneyShield X — Milestone 18: Release Artifact Manifest

## 1. Verified Release Artifacts

| Artifact Name | Path | Size | SHA-256 Checksum |
|---|---|---|---|
| **Frontend Production Bundle** | `frontend/dist/` | 945.8 KB (JS) + 91.4 KB (CSS) | Verified via Vite build manifest |
| **Mobile JavaScript Asset** | `mobile/build_output/apk_root/assets/index.android.bundle` | 177,320 bytes | `9b3f07a507f3521d1b5a5b5123d46152a514d7990beec9728cb11df1df0cfec9` |
| **Dalvik Executable Bytecode**| `mobile/build_output/apk_root/classes.dex` | 8,432 bytes | `0683a54b387e07663e0fafe05d15a51e6d42048aa79872be9c3f4ceb5f886f4a` |
| **RSA-2048 Debug Keystore** | `mobile/keystores/honeyshield-debug.keystore` | 2,247 bytes | Verified via `keytool -list` |
| **PostgreSQL 17 Benchmark** | `docs/release/milestone18/evidence/postgresql_hunting_benchmark.json` | 1,420 bytes | Real database measurements |

## 2. Integrity Verification
All compiled assets were generated directly from source code at commit `7765c35562eb89eba1ab70a41ab7ee30b27f2d53`.
No unsigned or unverified binaries are staged in release candidates.

