# HoneyShield X — Phase 4 Device Pairing Security Architecture

**Document ID:** `HSX-DOC-P4-003`  
**Phase:** 4 — Secure Device Association  
**Date:** 2026-11-04  
**Author:** Principal Cryptographic Architect & Security Engineer  
**Classification:** Internal Technical Standard  

---

## 1. Threat Model & Association Vulnerabilities

Traditional mobile app pairing protocols frequently suffer from:
1. **Long-Lived Secret Exposure:** Static tokens embedded in QR codes that can be shoulder-surfed or photographed.
2. **Credential Transmission:** Transmitting plaintext passwords or bearer tokens over QR optical channels.
3. **Replay Attacks:** Intercepting a scanned token and reusing it from an unauthorized device.
4. **Lack of Operator Attestation:** Unsupervised device enrollment directly granting administrative access.

---

## 2. HoneyShield X Single-Use Ephemeral QR Protocol

HoneyShield X resolves these vulnerabilities through an ephemeral, multi-stage, out-of-band enrollment handshake:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as SOC Administrator
    participant Web as SOC Central Console
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Mobile as Android Mobile App

    Admin->>Web: Request New Device Pairing Challenge
    Web->>API: POST /api/v1/auth/pairing/challenge
    API->>API: Generate Cryptographic Nonce (hsx_pair_...)
    API->>DB: Store Challenge (TTL: 180s, Status: PENDING)
    API-->>Web: Return challenge_id & pairing_uri
    Web->>Admin: Display QR Code (honeyshield://pairing?challenge=...)

    Admin->>Mobile: Aim Camera at QR Code
    Mobile->>Mobile: Extract Challenge & Inspect Device Fingerprint
    Mobile->>API: POST /api/v1/auth/pairing/claim (fingerprint, metadata)
    API->>DB: Validate TTL & Update Status to CLAIMED
    API-->>Mobile: Claim Accepted (Awaiting SOC Approval)

    Admin->>API: POST /api/v1/auth/pairing/approve/{challenge_id} (Passphrase Step-Up)
    API->>DB: Verify Admin Step-Up & Set Status to APPROVED
    API->>API: Emit SystemEvent (DEVICE_PAIRING_APPROVED)
    API-->>Admin: Approval Confirmed

    Mobile->>API: GET /api/v1/auth/pairing/status/{challenge_id}
    API-->>Mobile: Status: APPROVED
    Mobile->>Mobile: Persist Hardware-Bound Session Token
```

---

## 3. Protocol Invariants & Controls

### 3.1 Non-Credential QR Payloads
The QR code contains **no bearer tokens, private keys, or passwords**. The payload is an opaque URI:
`honeyshield://pairing?challenge=hsx_pair_49CxroTceq4PFyTe2m9IThHzd2XPQlv1wnj6NUiD3C0&endpoint=https://soc.honeyshield.local/api/v1`

### 3.2 180-Second Strict Expiration
Challenges expire after 180 seconds (`PAIRING_CHALLENGE_TTL_SECONDS = 180`). If not claimed and approved within this window, the backend transitions the record to `expired` and returns `410 Gone`.

### 3.3 Replay Protection
A challenge can be claimed exactly once. Subsequent claim attempts return `409 Conflict`.

### 3.4 Mandatory Administrative Step-Up Approval
Even after an Android device successfully claims a challenge, the device remains in `claimed` state without API access until a SOC Administrator executes the `/approve` endpoint presenting a valid step-up confirmation passphrase (min 8 characters).

### 3.5 Immediate Revocation
Administrators can terminate any pairing session instantly via:
`POST /api/v1/auth/pairing/revoke/{challenge_id}`

### 3.6 Full Audit Trail
All state transitions are logged immutably into `system_events`:
- `DEVICE_PAIRING_REQUESTED`
- `DEVICE_PAIRING_CLAIMED`
- `DEVICE_PAIRING_APPROVED`
- `DEVICE_PAIRING_REVOKED`

