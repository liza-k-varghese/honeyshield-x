# Milestone 12.2 — Secure QR Pairing Protocol & Implementation

**Document:** `milestone12_2_qr_pairing.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. QR Device Pairing Protocol Specification

The pairing flow enables frictionless, secure operator onboarding from desktop to mobile:

1. **Initiation:** Web administrator initiates pairing via `POST /api/v1/auth/pair/initiate` (requires administrative step-up approval).
2. **Challenge Creation:** Backend generates a high-entropy random token with a strict 180-second TTL stored in PostgreSQL and Redis.
3. **QR Rendering:** Web interface presents the ephemeral challenge in an encrypted QR matrix.
4. **Mobile Ingestion:** Mobile app opens `PairingQrScannerScreen.tsx`, scans the code, and computes a local hardware device fingerprint.
5. **Exchange & Invalidation:** Mobile submits `POST /api/v1/auth/pair/complete` with challenge payload and device fingerprint. The challenge is marked `USED` immediately (atomic single-use).
6. **Token Issuance:** Backend issues an authenticated device JWT session bound to the unique hardware fingerprint.

## 2. Cryptographic Security Tests

- **Replay Rejection:** Subsequent requests using the same token fail with `401 Unauthorized`.
- **TTL Expiration:** Challenges past 180 seconds return `400 Bad Request: Pairing Challenge Expired`.
- **Bearer Token Isolation:** Raw administrative bearer tokens are never embedded directly inside the QR code.

