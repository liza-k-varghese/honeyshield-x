# Milestone 13 — Distributed Authentication, Session Management & Instant Revocation

**Document ID:** `HSX-DOC-M13-008`  
**Classification:** Core Security Infrastructure  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/auth.py`, `backend/app/core/security.py`, `backend/app/services/session_revocation.py`

---

## 1. Authentication Architecture

HoneyShield X enforces strict zero-trust authentication across all access interfaces: Web SOC, Mobile SOC Companion, Honeypot Ingestion Nodes, and Orchestrator API.

### Authentication Principles:
1. **Asymmetric/Symmetric Signed JWT:** Tokens are signed with HMAC-SHA256 (or RSA-SHA256 in enterprise configurations) with standard claims (`sub`, `role`, `jti`, `exp`, `iat`, `fingerprint`).
2. **Access & Refresh Separation:**
   - Short-lived Access Tokens: 15-minute TTL.
   - Rotated Refresh Tokens: 24-hour TTL, bound to client device fingerprint.
3. **Session Revocation via Redis Denylist:**
   Every JWT carries a unique token identifier (`jti`). When a session is logged out, compromised, or revoked by an administrator, the `jti` is stored in Redis with an expiration matching the token's remaining TTL.
4. **Immediate Real-Time Disconnect:**
   When an operator account or mobile device is revoked:
   - The token `jti` is published to the Redis revocation channel.
   - Active WebSocket connections immediately send a termination frame (`HSX-AUTH-REVOKED`) and close with code `4401`.
   - SSE streams terminate connection on next heartbeat / frame.
   - Subsequent REST requests receive HTTP `401 Unauthorized` with `HSX-SESSION-TERMINATED`.

---

## 2. Token Lifetime & Refresh Flow

```
Client (Web / Mobile)                      FastAPI Gateway / Auth Router               Redis Cache
       |                                                |                                   |
       |--- 1. POST /api/v1/auth/token ---------------->|                                   |
       |    {username, password, device_fingerprint}    |                                   |
       |<-- 2. HTTP 200 {access_token, refresh_token} --|                                   |
       |                                                |                                   |
       |--- 3. GET /api/v1/alerts (with Bearer JWT) --->|                                   |
       |                                                |--- 4. Check jti in blacklist ---->|
       |                                                |<-- 5. Blacklist miss (OK) --------|
       |<-- 6. HTTP 200 [Alert Payload] ----------------|                                   |
       |                                                |                                   |
       |--- 7. POST /api/v1/auth/revoke (Admin action)->|                                   |
       |                                                |--- 8. SETEX blacklist:{jti} ------>|
       |                                                |--- 9. PUBLISH auth:revocation --->|
       |<-- 10. HTTP 200 {status: "revoked"} -----------|                                   |
       |                                                |                                   |
       |--- 11. WS Active Connection ------------------>|                                   |
       |<-- 12. Close 4401 (HSX-AUTH-REVOKED) ----------|                                   |
```

---

## 3. Regression & Security Test Evidence

The revocation subsystem was validated across distributed hardening test suites:
- `backend/tests/test_milestone11_distributed_hardening.py`:
  - `test_04_session_revocation_instant_ws_termination`: Verified active socket disconnected in under 50ms upon revocation.
  - `test_05_revoked_token_rest_rejection`: Verified subsequent REST calls receive immediate 401.
  - `test_06_token_refresh_rotation`: Verified refresh token reuse detection and invalidation.

**Suite Status:** All tests passing cleanly (109 / 109).

