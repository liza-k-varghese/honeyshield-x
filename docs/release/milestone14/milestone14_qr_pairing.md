# Milestone 14 — Secure QR Device Pairing Protocol & Challenge Lifecycle

**Document ID:** `HSX-DOC-M14-018`  
**Classification:** Cryptographic Handshake & Identity Pairing  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Challenge Lifecycle & Cryptographic Protocol

The HoneyShield X QR pairing protocol securely couples a mobile handset to an authorized SOC operator session without exposing persistent credentials:

```
Web SOC (Operator)                  Backend Ingestion API                 Mobile Handset
       │                                       │                                 │
       ├── 1. POST /devices/pair/initiate ────>│                                 │
       │    (Session Token + Admin Auth)       ├── 2. Generates Ephemeral Secret │
       │<── 3. Returns Session ID & Secret ────┤    (180s TTL in Redis)          │
       │                                       │                                 │
       ├── 4. Displays QR Code in Console      │                                 │
       │    Payload: {sessionId, secret}       │                                 │
       │                                       │<── 5. Scans QR & Posts Claim ───┤
       │                                       │    {sessionId, secret, pubKey}  │
       │                                       │                                 │
       │<── 6. WS Prompt: Confirm Pixel 8? ────┤                                 │
       ├── 7. Operator Approves Device ───────>│── 8. Atomically Deletes Secret ─┤
       │                                       │── 9. Issues Device JWT ────────>│
```

---

## 2. Key Security Properties

1. **Ephemeral Expiration (180s TTL):** Pairing secrets expire automatically after 180 seconds.
2. **Strict Single-Use Consumption:** Once claimed, the secret is atomically deleted from Redis. Replay attempts fail immediately with HTTP 400.
3. **Zero Bearer Tokens in QR Payload:** The optical QR payload contains only `{sessionId, registrationNonce}`. No JWTs, API keys, or operator passwords are ever optically encoded.
4. **Step-Up Approval:** Web SOC operator must explicitly inspect the incoming device fingerprint and confirm pairing.
5. **Rate Limiting:** Maximum 5 pairing challenges per minute per operator account.

---

## 3. Test & Verification Evidence

Verified in `backend/tests/test_phase4_release_and_pairing.py`:
- `test_01_qr_challenge_generation`: High-entropy challenge creation.
- `test_02_qr_challenge_claim_lifecycle`: End-to-end claim and device registration.
- `test_03_qr_challenge_claim_replay_rejected`: Duplicate claim rejected with HTTP 400.
- `test_04_admin_stepup_approval`: Step-up approval authorization enforced.
- Matrix status: **100% Passed**.

