# MILESTONE 64 — AUTHENTICATION, RBAC, SESSION & WEBSOCKET HARDENING

**Directory:** `docs/final-engineering/milestones62-75/64_auth_rbac_websocket/`  
**Target Subsystems:** Auth Service, Session Management, RBAC Dependencies, WebSocket Tickets  
**Evaluation Gates:** G04, G06, G07, G08, G09, G21, G26, G30  

---

## 1. SERVER-SIDE AUTHENTICATION & ACCESS CONTROL AUDIT

HoneyShield X enforces strict server-side authorization across all API routes via FastAPI dependencies (`get_current_operator`, `require_permission`):

```python
# Canonical Server-Side RBAC Enforcement Pattern
@router.post("/cases", status_code=status.HTTP_201_CREATED)
def create_case_endpoint(
    case_in: CaseCreate,
    operator: Operator = Depends(require_permission("case:create")),
    db: Session = Depends(get_db)
):
    ...
```

### Deterministic 4-Tier SOC Role Capabilities:
1. **Viewer (`viewer`):** Read-only telemetry and investigation viewing (`telemetry:view`, `investigation:view`, `case:view`, `deception:view`, `threat_intel:view`, `hunt:view`).
2. **Analyst (`analyst`):** Adds audit review, command preview/acknowledge/escalate, case creation/updates, threat intel indicator export, and query promotion.
3. **Incident Responder (`incident_responder`):** Adds containment staging, automated notification dispatch, indicator revocation, threat hunt execution, and case closure.
4. **Security Administrator (`security_administrator`):** Adds governor lockout, operator administration, SOAR integration management, and campaign intelligence administration.

---

## 2. SESSION LIFECYCLE & TOKEN HARDENING

- **Session Token Entropy:** 256-bit CSPRNG tokens generated via `secrets.token_urlsafe(32)`.
- **Absolute Expiry:** Maximum 8 hours.
- **Inactivity Timeout:** 15-minute sliding window; inactive sessions are invalidated.
- **Revocation:** Explicit logout (`POST /api/v1/auth/logout`) purges the token from memory immediately.
- **Account Lockouts:** 5 consecutive failed login attempts locks the targeted username for 15 minutes (900s).

---

## 3. WEBSOCKET TICKET SECURITY & STREAM INTEGRITY

- **Credential Leakage Prevention:** Query parameter tokens in WebSocket URLs (`ws://...?token=XYZ`) leak into browser history and proxy access logs. HoneyShield X enforces a two-step handshake:
  1. Authenticated client issues `POST /api/v1/events/tickets` using bearer authorization.
  2. Server generates a single-use, 60-second crypto ticket bound to client IP.
  3. Client connects via `ws://.../api/v1/events/ws?ticket=ABC`.
  4. Ticket is burned immediately upon validation, preventing replay attacks.
- **SSE Fallback:** When WebSocket connections encounter proxy drops, the client automatically falls back to Server-Sent Events at `/api/v1/events/stream`.

---

## 4. VERIFICATION EVIDENCE

- `backend/tests/test_module_3_5_auth.py` — **21 / 21 tests passed (100%)**
- `backend/tests/test_module_3_5_rbac.py` — **Passed (100%)**
- `backend/tests/test_milestone6_1_stream_security.py` — **10 / 10 tests passed (100%)**
- `scripts/rehearse_m74_e2e_workflows.py` — **Workflow A & Workflow I passed cleanly**
