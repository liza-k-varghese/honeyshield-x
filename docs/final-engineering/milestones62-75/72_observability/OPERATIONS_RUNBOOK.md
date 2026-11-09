# MILESTONE 72 — PRODUCTION OBSERVABILITY & OPERATIONS RUNBOOK

**Directory:** `docs/final-engineering/milestones62-75/72_observability/`  
**Target Subsystems:** Structured Logging, Healthchecks, Metrics, Incident Runbooks  
**Evaluation Gates:** G28, G29, G32, G53  

---

## 1. OBSERVABILITY ARCHITECTURE

HoneyShield X provides three tiers of operational visibility:
1. **Liveness & Readiness Probes:**
   - `GET /api/v1/health`: API process liveness check.
   - `GET /api/v1/dashboard/stats`: Returns connected database status, Redis ping, and service health breakdown (`total_services: 3`, `healthy_services: 3`).
2. **Correlation ID & Tracing:**
   - `ObservabilityTracingMiddleware` injects `X-Request-ID` into every HTTP response header and binds it to log records.
3. **Structured Event Logs:**
   - Logs output as JSON with timestamp, severity, component, and redacted credentials.

---

## 2. COMMON INCIDENT OPERATIONS RUNBOOKS

### Runbook 1: PostgreSQL Connection Failure
- **Symptom:** API returns HTTP 500; logs show `psycopg.OperationalError: connection to server at "127.0.0.1", port 5432 failed`.
- **Diagnosis:**
  ```bash
  ss -tulpn | grep 5432
  docker ps -f name=postgres
  ```
- **Remediation:**
  1. Restart database container: `docker restart honeyshield-postgres`
  2. Verify credentials match `.env`: `PGPASSWORD=$POSTGRES_PASSWORD psql -h 127.0.0.1 -U honeyshield -c "SELECT 1;"`
  3. API pool will automatically reconnect on next request via `pool_pre_ping=True`.

### Runbook 2: WebSocket Stream Disconnection
- **Symptom:** Digital Universe HUD shows `Connection: Reconnecting...` or `STANDBY`.
- **Diagnosis:**
  ```bash
  ss -tulpn | grep 6379
  tail -n 50 /var/log/honeyshield/backend.log | grep -E "ticket|ws"
  ```
- **Remediation:**
  1. Check Redis process: `redis-cli ping`
  2. Frontend automatically falls back to SSE stream at `/api/v1/events/stream`.
  3. Ensure reverse proxy has `proxy_set_header Upgrade $http_upgrade` configured.

### Runbook 3: Digital Universe Animation Stalled
- **Symptom:** Robots remain docked at base stations without moving.
- **Diagnosis:**
  1. Press `Space` to ensure relay is playing (`isLocomotionPlaying: true`).
  2. Check mode badge: In `LIVE` mode, robots only move when live events are committed to outbox. In `DEMO` mode, robots cycle automatically.
  3. Press `D` to toggle demo playback, or `R` to reset locomotion to origin.
