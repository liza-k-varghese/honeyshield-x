# Milestone 13 — Multi-Operator Role-Based Access Control (RBAC) & Persona Qualification

**Document ID:** `HSX-DOC-M13-018`  
**Classification:** Access Control & Operational Governance  
**Release Candidate:** `v1.0.0-rc5`  
**Reference Implementations:** `backend/app/core/rbac.py`, `backend/app/auth.py`

---

## 1. 4-Tier Operator RBAC Hierarchy

HoneyShield X enforces granular, principle-of-least-privilege role-based access control across all API endpoints, Web SOC views, and mobile interfaces.

### Role Definitions & Entitlements:

| Role Identifier | Role Title | Read Permissions | Mutation / Triage | Containment & SOAR | Administrative Controls |
|:---|:---|:---|:---|:---|:---|
| `admin` | Platform Administrator | All telemetry, logs, audit trails | All incidents and notes | Full dry-run / live execution | User management, pairing approve, token revoke |
| `responder` | Incident Responder | Alerts, attacks, threat intel, sensors | Triage, acknowledge, close alerts | Execute playbook containment | None |
| `analyst` | Threat Analyst | Alerts, attacks, threat intel, decoys | Annotate alerts, request correlation | Request containment approval | None |
| `viewer` | Executive / Read-Only | Dashboard aggregates, high-level metrics | None (Read-only) | None | None |

---

## 2. API Endpoint Protection Matrix

| API Route | HTTP Method | Minimum Required Role | Unprivileged Attempt Response |
|:---|:---|:---|:---|
| `/api/v1/alerts` | `GET` | `viewer` | HTTP 401 if unauthenticated |
| `/api/v1/alerts/{id}/acknowledge` | `POST` | `analyst` | HTTP 403 Forbidden |
| `/api/v1/containment/isolate-host` | `POST` | `responder` | HTTP 403 Forbidden |
| `/api/v1/devices/pair/approve` | `POST` | `admin` | HTTP 403 Forbidden |
| `/api/v1/auth/revoke` | `POST` | `admin` | HTTP 403 Forbidden |

---

## 3. Persona Qualification & Audit Evidence

Role enforcement is tested in `backend/tests/test_milestone7_trust_boundaries.py` and `test_milestone8_operational_readiness.py`:
- `test_viewer_cannot_contain`: Verified `viewer` receives HTTP 403 when invoking containment playbooks.
- `test_analyst_cannot_pair_devices`: Verified `analyst` cannot approve mobile pairing requests.
- `test_admin_full_lifecycle`: Confirmed `admin` can revoke compromised tokens and manage all system entities.
- All RBAC violations log structured audit events with client IP, requested route, user ID, and timestamp.

