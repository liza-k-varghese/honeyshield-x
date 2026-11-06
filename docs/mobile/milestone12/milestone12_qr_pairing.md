# Milestone 12 — Secure QR Device Pairing Protocol

**Document:** `milestone12_qr_pairing.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. QR Device Pairing Protocol Specification

The HoneyShield X QR Device Pairing Protocol provides an out-of-band channel for establishing an authorized mobile SOC terminal without exposing raw credentials.

### Protocol Sequence:

```
[Web SOC Command Center]               [HoneyShield Backend]                 [Mobile Android Client]
          |                                      |                                      |
          |-- 1. POST /pair/initiate ----------->|                                      |
          |   (requires Admin Step-Up)           |                                      |
          |<-- 2. QR Payload + 180s TTL Token --|                                      |
          |                                      |                                      |
          |======== 3. Operator Scans QR Code with Mobile Camera =====================>|
          |                                      |                                      |
          |                                      |<-- 4. POST /pair/complete -----------|
          |                                      |    (Payload + Device Fingerprint)    |
          |                                      |-- 5. Validate & Mark Token Used ---->|
          |                                      |<-- 6. Issue Bound Session JWT -------|
          |                                      |                                      |
          |<-- 7. Audit Log: Device Paired ------|                                      |
```

## 2. Security Safeguards

- **Strict Single-Use:** The pairing token is atomically invalidated in the PostgreSQL database upon first retrieval. Subsequent replay attempts return `401 Unauthorized`.
- **180-Second Strict TTL:** Pairing tokens are timestamped with an expiration of 180 seconds. Expired tokens are rejected automatically.
- **Admin Step-Up Required:** Only operators with elevated `ADMIN` or `SECURITY_LEAD` privileges can initiate mobile device pairing.
- **Hardware Binding:** Mobile device fingerprints (unique hardware salt + Android ID hash) are stored alongside the authorization grant.

