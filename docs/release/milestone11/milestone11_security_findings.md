# Milestone 11 — Security Findings, Discrepancy Analysis & Remediation Log

**Component:** Application Security & Threat Architecture  
**Audit Scope:** Distributed Auth, Token Storage, Concurrency, Rule Configurations  

---

## 1. Discrepancy Analysis: SSH Brute-Force Detection Window

During the Part 9.2 security audit, a discrepancy was noted between historical narrative documentation and the authoritative source code:
- **Historical Narrative Docs:** Certain early design notes referenced a "60-second SSH brute-force detection window".
- **Authoritative Code (`backend/app/detection/rules.py`):**
  ```python
  DEFAULT_SSH_WINDOW_MINUTES = 5  # 300 seconds
  DEFAULT_SSH_THRESHOLD = 5       # 5 failed attempts
  ```
- **Engineering Determination:** The 300-second (5 minute) window with a 5-attempt threshold is confirmed as the intended enterprise configuration. It avoids false positives on high-latency SSH connections and provides superior coverage against low-and-slow brute-force campaigns. The documentation is hereby updated to reflect the authoritative code behavior.

## 2. Key Security Remediations Delivered in Milestone 11

| Finding ID | Severity | Root Cause | Remediated Architecture |
|---|---|---|---|
| **HSX-SEC-1101** | HIGH | Non-atomic `GET` + `DEL` in WebSocket ticket redemption | Implemented atomic Lua script `LUA_ATOMIC_GETDEL` |
| **HSX-SEC-1102** | HIGH | Unshared process-local memory sessions on Redis outage | Added `HONEYSHIELD_STRICT_AUTH_COORDINATION` fail-closed mode |
| **HSX-SEC-1103** | HIGH | Active WebSockets remained open after session revocation | Implemented `revoke_operator_connections` with RFC 6455 close code 1008 |
| **HSX-SEC-1104** | MEDIUM | Pre-commit security event broadcast on rolled-back transactions | Implemented SQLAlchemy `after_commit` & `after_rollback` hooks |
| **HSX-SEC-1105** | MEDIUM | Deactivated operators continued receiving broadcast frames | Added per-frame operator active check in `broadcast_event()` |

