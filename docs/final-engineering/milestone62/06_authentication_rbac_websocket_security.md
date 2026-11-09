# AUTHENTICATION, RBAC & WEBSOCKET SECURITY VERIFICATION

**File Reference:** `backend/app/auth/`, `backend/app/routers/auth.py`, `backend/app/events/tickets.py`  
**Test Suite Reference:** `backend/tests/test_module_3_5_auth.py`, `backend/tests/test_milestone6_1_stream_security.py`  
**Release Gate:** G21, G30  

---

## 1. AUTHENTICATION & ACCESS CONTROL ARCHITECTURE

HoneyShield X enforces zero-trust role-based access control (RBAC) across 4 operational tiers:
1. **Viewer (`viewer`):** Telemetry view, investigation view.
2. **Analyst (`analyst`):** Adds audit view, command preview/acknowledge/escalate, case management, active deception inspection, threat intelligence enrichment.
3. **Incident Responder (`incident_responder`):** Adds containment staging, automated notification dispatch, case closure, indicator revocation, threat hunt execution.
4. **Security Administrator (`security_administrator`):** Adds governor emergency override/lockout, user administration, integration management, campaign admin.

---

## 2. SECURITY CONTROLS TESTED & VERIFIED

### Cryptographic Identity & Passwords:
- **Hashing Algorithm:** PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte cryptographically secure random salt.
- **Session Tokens:** 256-bit CSPRNG bearer tokens (`secrets.token_urlsafe(32)`).
- **Session Expiration:** 8-hour maximum lifetime; 15-minute idle inactivity timeout.

### Brute Force & Rate Limiting:
- **IP Rate Limiting:** 5 authentication requests per minute per IP address.
- **Account Lockout:** 5 consecutive failed login attempts locks the targeted account for 15 minutes (900 seconds).
- **Reset On Success:** A valid authentication immediately resets the failed login attempt counter.

### Emergency Break-Glass Procedure:
- Time-bounded 30-minute break-glass emergency session requiring mandatory justification text (>= 20 characters) and dedicated cryptographic passphrase verification.

---

## 3. WEBSOCKET & SSE STREAM SECURITY

1. **Short-Lived Streaming Tickets:** WebSockets reject raw bearer tokens in query strings to avoid browser history credential leakage. Clients must obtain a 60-second single-use ticket via authenticated `POST /api/v1/events/tickets`.
2. **Ticket Binding & Invalidation:** Tickets are bound to the authenticated operator's user ID and client IP, and invalidated upon first use or after 60 seconds.
3. **Automatic Fallback:** If WebSocket handshake fails (e.g., HTTP 503 during load rebalancing), the frontend automatically downgrades to Server-Sent Events (SSE) at `/api/v1/events/stream`.

---

## 4. REGRESSION VERIFICATION RESULTS

- `backend/tests/test_module_3_5_auth.py`: **21 / 21 tests PASSED (100%)**
- `backend/tests/test_milestone6_1_stream_security.py`: **10 / 10 tests PASSED (100%)**
- `backend/tests/test_auth_production_hardening.py`: **3 / 3 tests PASSED (100%)**
