# HoneyShield X — Milestone 17: Secure QR Device Pairing Protocol

## 1. Overview
The HoneyShield X pairing protocol securely connects mobile companion devices to the SOC backend using short-lived cryptographic challenges and out-of-band operator verification.

## 2. Cryptographic Handshake Workflow
```
[Web SOC Console]                     [PostgreSQL / Redis]                [Android Client]
        |                                      |                                  |
   1. Generate QR Code                         |                                  |
      POST /api/v1/mobile/pairing/challenge -> Store Challenge (60s TTL)         |
        |                                      |                                  |
        |---- Displays QR Code (challenge_id, ephemeral key, rendezvous URL) ---->|
                                               |                           2. Scans QR Code
                                               |                           Generates EC Keypair
                                               |<-- POST /pairing/claim ---|
                                               |    (device_fp, pubkey)           |
        |<-- Operator Notified in Console -----|                                  |
   3. Operator Approves Pairing (RBAC Check)   |                                  |
      POST /api/v1/mobile/pairing/approve ---->| Update status='approved'         |
                                               |                                  |
                                               |<-- Polls /pairing/status --------|
                                               |--- Returns session bearer token -|
```

## 3. Protocol Security Attributes
- **Ephemeral Lifetime:** Challenges expire after 60 seconds; unapproved challenges are automatically purged.
- **Hardware Binding:** Public keys generated in Android hardware Keystore are bound to the operator account.
- **Non-Transferability:** Pairing requires authenticated web operator approval (`security_administrator` or `incident_responder`).
- **Immediate Revocation:** Administrators can revoke paired devices with instant WebSocket disconnect.

## 4. Test Verification
- Challenge model persistence and expiry contracts: **PASSED (Verified in `test_02`)**
- Session creation and instant revocation: **PASSED (Verified in `test_10`)**

