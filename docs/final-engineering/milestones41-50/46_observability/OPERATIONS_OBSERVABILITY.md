# Milestone 46 — Enterprise Observability, Diagnostics & Health Telemetry

**Release Candidate:** `v1.0.0-rc5`  
**Tracing & Monitoring:** Structured JSON Logging, `X-Request-ID` Tracing, Health Probes  
**Status:** **PASSED / PRODUCTION HARDENED**  

---

## 1. Observability Architecture & Request Correlation

```
[Incoming HTTP / WebSocket Request]
                 │
                 ▼
 [ObservabilityTracingMiddleware]
   - Extracts or generates UUID `X-Request-ID` (e.g. `99f3d9f8-abb3-4b87-bf22-6192205fff52`)
   - Starts high-resolution monotonic timer (`time.perf_counter()`)
   - Injects correlation ID into context and response headers
                 │
                 ▼
       [Router & Business Logic]
   - Logs include structured fields: `{"request_id": "...", "operator": "...", "status": ...}`
                 │
                 ▼
 [Outbox & Ingestion Lifecycle Metrics]
   - Records database execution latency and outbox publish status
                 │
                 ▼
      [Response Transmission]
   - Response header `X-Request-ID` returned to client for frontend cross-correlation
```

---

## 2. Health & Readiness Probes

HoneyShield X implements two distinct operational health endpoints:

### A. Liveness Probe (`GET /health`)
- **Purpose:** Verifies that the FastAPI process is responsive and that core backing stores are reachable.
- **Probe Logic:**
  - Executes `SELECT 1` against PostgreSQL with a 2.0-second socket timeout.
  - Executes `PING` against Redis with a 1.0-second socket timeout.
- **Responses:**
  - **HTTP 200 OK (`status: "ok"`):** Both PostgreSQL and Redis report `connected`.
  - **HTTP 503 Service Unavailable (`status: "degraded"`):** Either database or Redis is disconnected; response includes exact failing component without leaking credentials.

### B. System Overview Diagnostics (`GET /api/v1/system/overview`)
- Returns real-time platform statistics:
  - Total sensor attacks ingested.
  - Active incident cases.
  - Active deception decoys.
  - Outbox queue depth and processing velocity.

---

## 3. Digital Universe Frontend Diagnostics

The Digital Universe (`UniverseCommandCenter.tsx`) exposes real-time operational diagnostics to operators via the **Trust & Telemetry Bar** and the **Holographic Core Diagnostics Modal**:

| Diagnostic Field | Display State | Source of Truth |
| :--- | :--- | :--- |
| **Operational Mode** | `DEMO` / `LIVE` / `REPLAY` | Current view state |
| **Backend Stream Status** | `CONNECTED` (Green) / `DEGRADED` (Amber) / `DISCONNECTED` (Red) | Live WebSocket connection state |
| **Monotonic Outbox Cursor** | Monotonic integer (e.g. `CURSOR #819`) | PostgreSQL / Redis cursor |
| **Active Relay Carrier** | `SCOUT` / `NEXUS` / `ORACLE` / `SENTINEL` | State machine stage |
| **Carrier State** | `DOCK IDLE` / `DEPLOYED / IN TRANSIT` / `HANDOFF` | Locomotion engine progress |
| **Transit Speed** | `0.5x` / `1.0x` / `2.0x` | Operator playback setting |

---

## 4. Production Alerting Thresholds & Operational Playbooks

| Alert Condition | Metric / Trigger | Severity | Actionable Operational Playbook |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Disconnect** | `/health` returns `postgresql: "error"` for > 3 consecutive checks | **P1 (Critical)** | Check container status: `docker logs honeyshield-postgres --tail 50`; verify socket 5432. |
| **Redis Disconnect** | `/health` returns `redis: "error"` for > 3 consecutive checks | **P2 (High)** | In-memory fallback activates; restart Redis container: `docker restart honeyshield-redis`. |
| **Outbox Backlog Spurt** | Uncommitted outbox records > 5,000 | **P2 (High)** | Inspect ingestion worker logs; scale Uvicorn worker count. |
| **API Latency Degradation** | `GET /health` P95 latency > 100 ms | **P3 (Medium)** | Check database connection pool saturation in `pg_stat_activity`. |
