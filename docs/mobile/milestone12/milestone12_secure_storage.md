# Milestone 12 — Mobile Secure Storage & Hardware Keystore Integration

**Document:** `milestone12_secure_storage.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Storage Architecture

Mobile telemetry, session credentials, and offline caches are partitioned into three isolation rings:

| Tier | Storage Engine | Contents | Protection Level |
|---|---|---|---|
| **Tier 1: Hardware Keystore** | Android KeyStore / `expo-secure-store` | JWT Access/Refresh tokens, Device Private Key, QR single-use challenge | AES-256-GCM hardware-backed enclave; biometric authentication required for unlock |
| **Tier 2: Encrypted SQLite** | SQLite / WatermelonDB | Monotonic outbox cursor, offline event queue, cached alert metadata | Encrypted database file on internal sandbox storage (`/data/data/com.honeyshield.soc/`) |
| **Tier 3: Volatile Memory** | React State / Zustand | Active WebSocket frames, courier animation coordinates, uncommitted form inputs | Erased on app backgrounding or session timeout |

## 2. Zero-Trust Storage Invariants

1. No plain-text tokens or passwords are ever written to `AsyncStorage`, `SharedPreferences`, or console logs.
2. In-flight pairing challenges are wiped immediately after the pairing exchange handshake completes.
3. Wiping of Tier 1 tokens occurs instantly upon receiving a device revocation signal or invalid signature frame.

