# HoneyShield X — Milestone 18: QR Code Device Pairing Security

## 1. Cryptographic Handshake Protocol
The HoneyShield X pairing handshake prevents eavesdropping and session hijacking:

```
[Web SOC Console]                     [PostgreSQL Database]               [Android Device]
        │                                       │                                 │
1. Generate QR Challenge                        │                                 │
   POST /mobile/pairing/challenge               │                                 │
        │── Store Challenge (60s TTL) ─────────>│                                 │
        │                                       │                          2. Scan QR Code
        │                                       │<── POST /pairing/claim ─────────│
        │                                       │    (challenge_id, dev_fingerprint)
        │<── Notify Operator of Claim ──────────│                                 │
3. Operator Approves Pairing (RBAC Guard)       │                                 │
   POST /mobile/pairing/approve                 │                                 │
        │── Update Challenge (status='approved')>│                                │
        │                                       │<── GET /pairing/status ─────────│
        │                                       │─── Returns Session Bearer ─────>│
```

## 2. Non-Negotiable Security Attributes
- **Ephemeral Lifetime:** 60-second automatic expiration.
- **Single-Use Consumption:** Challenge state transitions to `consumed` immediately upon claim; replays are rejected with `HTTP 409 Conflict`.
- **Zero Embedded Secrets:** QR codes contain only the rendezvous `challenge_id` and public server endpoint URL; administrative credentials and permanent tokens are never encoded in QR payloads.

## 3. Test Verification
- Verified in `backend/tests/test_milestone17_sdk_recovery_and_defense.py`:
  - `test_02_android_security_enclave_and_pairing_tokens`: **PASSED**

