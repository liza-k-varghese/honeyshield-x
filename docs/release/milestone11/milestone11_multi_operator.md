# Milestone 11 — Multi-Operator Concurrency & 4-Tier RBAC Enforcement

**Component:** Operator Registry & Role-Based Access Control  
**Roles:** `viewer`, `analyst`, `incident_responder`, `security_administrator`  
**Files Audited:** `backend/app/auth/registry.py`, `backend/app/events/store.py`  

---

## 1. 4-Tier Role Permission Matrix

| Role | Telemetry & Health | Live Event Stream | Case Creation | Threat Intel Updates | Governor Containment |
|---|---|---|---|---|---|
| **viewer** | Read Only | Filtered (Public Info) | Denied | Denied | Denied |
| **analyst** | Read Only | Sensor / Alerts / Intel | Granted | Granted | Denied |
| **incident_responder**| Read Only | Full Operational Stream| Granted | Granted | Level 1 & 2 Actions |
| **security_administrator**| Full Admin | Full Stream + Outbox Audit| Full Admin| Full Admin | Level 3 Nuclear Containment |

## 2. Multi-Operator Concurrency Protection
- **Per-Operator Connection Quota:** Enforces a maximum of 5 concurrent WebSocket connections per operator identity (`MAX_CONNECTIONS_PER_OPERATOR = 5`).
- **Quota Reclaim:** Connection closures cleanly decrement the active operator counter.
- **Deactivation Verification:** Deactivating an operator persona in `default_operator_registry` immediately revokes all active streaming sessions across all tiers.

