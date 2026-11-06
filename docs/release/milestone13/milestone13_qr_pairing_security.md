# Milestone 13 — Secure QR Device Pairing Protocol & Security Qualification

**Document ID:** `HSX-DOC-M13-007`  
**Classification:** Cryptographic & Authentication Architecture  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/routers/devices.py`, `backend/app/services/device_pairing.py`

---

## 1. Threat Model & Security Objectives

The QR device pairing protocol links an operator's mobile client to an active web SOC session without exposing long-lived credentials, API keys, or JWT bearer tokens inside the optical QR code payload.

### Critical Security Properties:
1. **Zero Bearer Tokens in QR Code:** The QR code encodes only a short-lived ephemeral pairing session ID and a high-entropy cryptographically random registration secret.
2. **Ephemeral TTL (180 Seconds):** Pairing sessions expire automatically after 180 seconds in Redis. Expired tokens are immediately purged and rejected.
3. **Strict Single-Use:** Upon successful redemption by a mobile device, the pairing session is atomically deleted from Redis. Any duplicate or replayed redemption attempt fails with `400 Bad Request / HSX-PAIR-INVALID-NONCE`.
4. **Step-Up Approval in Web SOC:** The web operator initiates pairing and must observe the incoming device registration metadata (device model, OS version, public key fingerprint) before pairing is finalized.
5. **Rate Limiting & Brute-Force Protection:** Pairing initiation is rate-limited to 5 requests per minute per IP to prevent session stuffing.

---

## 2. Cryptographic Protocol Flow

```
Web SOC (Authenticated)              Backend API (Redis Store)                 Mobile Device (Scanner)
        |                                       |                                         |
        |--- 1. POST /devices/pair/initiate --->|                                         |
        |    (Includes Analyst Session)         |                                         |
        |<-- 2. Returns pairing_id + secret ----|                                         |
        |    (180s TTL stored in Redis)         |                                         |
        |                                       |                                         |
        |=== 3. Renders QR Code in UI =========|                                         |
        |    Payload: {sessionId, secret}       |                                         |
        |                                       |--- 4. Scans QR & Generates Keypair ---->|
        |                                       |                                         |
        |                                       |<-- 5. POST /devices/pair/claim ---------|
        |                                       |    {sessionId, secret, deviceMeta, pubK}|
        |                                       |                                         |
        |<-- 6. WebSocket Prompt: Confirm? -----|    Atomic Token Redemption in Redis     |
        |--- 7. Operator Approves Device ------>|                                         |
        |                                       |--- 8. Issues Scoped Device JWT -------->|
        |                                       |    Stored in Android Hardware Keystore  |
```

---

## 3. Test & Verification Evidence

The pairing protocol was subjected to adversarial regression testing in `backend/tests/test_phase4_release_and_pairing.py`:
- `test_pairing_session_creation`: Verifies high entropy generation and 180s expiration.
- `test_pairing_single_use`: Confirms second redemption fails with `400 Bad Request`.
- `test_expired_pairing_rejection`: Confirms token is invalidated at `t + 181s`.
- `test_device_key_fingerprint_binding`: Confirms mobile identity is tied to device key.

**Test Matrix Status:** 100% Passed (109 / 109 Backend Suites).

