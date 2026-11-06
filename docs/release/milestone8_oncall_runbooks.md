# Milestone 8 — SRE On-Call Runbooks & Operational Alarms

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-06  

---

## 1. Overview of Platform Alarms

Operational alarms are evaluated by `OperationalAlertManager` (`backend/app/observability/alerts.py`) and exposed via `GET /api/v1/system/alerts/operational`.

---

## 2. On-Call Diagnostics & Runbooks

### 2.1 Database Failure (`ALARM-PG-UNAVAILABLE`)
- **Severity:** `CRITICAL`
- **Symptom:** API returns 500 or health endpoint indicates PostgreSQL disconnected.
- **Diagnostics:**
  ```bash
  # Check PostgreSQL container logs in staging
  docker compose -f docker/docker-compose.staging.yml logs staging-postgres --tail=50
  # Check PostgreSQL host service
  systemctl status postgresql
  ```
- **Remediation:**
  1. Restart database service: `docker compose -f docker/docker-compose.staging.yml restart staging-postgres`.
  2. Verify disk space: `df -h /var/lib/postgresql`.
  3. Validate connection string in `config/.env.staging`.

---

### 2.2 Redis Failure & Outbox Fallback (`ALARM-REDIS-DEGRADED`)
- **Severity:** `WARNING`
- **Symptom:** Health status indicates `DEGRADED`; mode is `outbox_fallback_active`.
- **Diagnostics:**
  ```bash
  docker compose -f docker/docker-compose.staging.yml logs staging-redis --tail=30
  redis-cli -p 6380 ping
  ```
- **Remediation:**
  1. Restart Redis container: `docker compose -f docker/docker-compose.staging.yml restart staging-redis`.
  2. Telemetry is safely buffered in PostgreSQL outbox; no data is lost during Redis outage.

---

### 2.3 Outbox Backlog Spike (`ALARM-OUTBOX-BACKLOG-SPIKE`)
- **Severity:** `WARNING`
- **Symptom:** Outbox backlog exceeds 50 unconfirmed events.
- **Diagnostics:**
  ```bash
  # Query current cursor and outbox depth via API
  curl -s -H "Authorization: Bearer $HSX_TOKEN" http://127.0.0.1:8001/api/v1/system/metrics | jq '.event_pipeline'
  ```
- **Remediation:**
  1. Inspect network connectivity between backend and client browsers.
  2. Verify WebSocket connection count to ensure consumers are attached.

---

### 2.4 WebSocket Authentication Failure Spike (`ALARM-WS-AUTH-FAILURE-SPIKE`)
- **Severity:** `WARNING`
- **Symptom:** More than 10 failed ticket attempts in a 60-second window.
- **Diagnostics:**
  - Inspect backend logs for `Missing connection ticket` or `Invalid, expired, or already-consumed ticket`.
- **Remediation:**
  1. Confirm frontend is minting tickets via `POST /api/v1/events/ticket` immediately prior to WebSocket connection.
  2. Verify system clock synchronization (NTP) if tickets are expiring prematurely.

---

### 2.5 Ingestion Schema Error Spike (`ALARM-INGESTION-ERROR-SPIKE`)
- **Severity:** `WARNING`
- **Symptom:** Sensor events rejected with HTTP 422.
- **Diagnostics:**
  - Check sensor payload formatting and message lengths (must not exceed 10,000 characters).
- **Remediation:**
  1. Inspect misconfigured honeypot listeners or log shippers sending oversized payloads.

