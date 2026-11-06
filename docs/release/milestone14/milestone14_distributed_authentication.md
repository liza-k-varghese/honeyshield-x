# Milestone 14 — Distributed Authentication, Session Security & Revocation

**Document ID:** `HSX-DOC-M14-012`  
**Classification:** Zero-Trust Identity & Session Security  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Multi-Worker Distributed Session Architecture

In a multi-worker enterprise deployment (multiple Uvicorn workers behind NGINX or Envoy), in-memory local session state causes authorization discrepancies. HoneyShield X enforces centralized session management via Redis:

```
[Client Request] ──> [Uvicorn Worker 1] ──> [Redis Central Session Denylist]
                 ──> [Uvicorn Worker 2] ──> [Redis Central Session Denylist]
```

### Key Security Controls:
1. **Cryptographic JWT:** Signed with HMAC-SHA256 (or RSA-256). Claims include `sub`, `role`, `jti`, `exp`, `fingerprint`.
2. **Access Token Lifespan:** Short 15-minute TTL.
3. **Rotating Refresh Tokens:** 24-hour TTL, bound to client device fingerprint. Replay of consumed refresh token invalidates entire session tree.
4. **Denylist Storage:** Revoked token `jti` stored in Redis with TTL matching remaining token lifespan.

---

## 2. Instant Active WebSocket & SSE Revocation

When an operator clicks "Logout" or an administrator revokes a device:
- The backend writes `jti` to `hsx:blacklist:{jti}`.
- A revocation event is published to `hsx:auth:revocation`.
- All workers terminate active WebSocket connections matching the operator or device with frame `HSX-AUTH-REVOKED` (Close code `4401`) in $< 50\text{ms}$.
- Active SSE streams terminate connection and abort chunk transmission.
- Subsequent REST requests receive HTTP `401 Unauthorized`.

---

## 3. Fail-Closed Posture During Redis Outages

> [!CAUTION]
> **Zero Fallback to Unchecked Access:**
> If Redis becomes unreachable, authentication **fails closed**. Any request requiring blacklist verification returns HTTP `503 Service Unavailable` rather than allowing unverified tokens to execute privileged operations.
> Verified in `backend/tests/test_milestone11_distributed_hardening.py` (`test_01_redis_outage_fail_closed_under_strict_policy`).

