# Milestone 8 — Production Observability, Tracing and Metrics

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-06  

---

## 1. Tracing & Correlation Middleware

Implemented in `backend/app/observability/middleware.py`:
- **Request Tracing:** Intercepts incoming requests and assigns an authoritative UUIDv4 `X-Request-ID`.
- **Correlation ID Propagation:** Respects caller-supplied `X-Correlation-ID` for cross-service distributed tracing or defaults to the request ID.
- **Response Headers:** Both `X-Request-ID` and `X-Correlation-ID` are returned in all HTTP responses.
- **Execution Latency:** Captures high-precision monotonic request duration (`time.perf_counter()`).
- **Secret Redaction:** Automatically masks `token=`, `ticket=`, `password=`, and `secret=` parameters in logged URLs (`redact_sensitive_query`).

---

## 2. In-Memory Metrics Registry (`MetricsCollector`)

Implemented in `backend/app/observability/metrics.py`:
Thread-safe, bounded memory metrics collector (`default_metrics_collector`) providing operational insights:

### Metrics Categories
1. **Request Counts & Latency:**
   - Latency distributions: p50, p95, p99, and arithmetic mean per endpoint and globally.
   - Request counts partitioned by `(method, path, status_code)`.
2. **Real-time WebSockets & SSE:**
   - `active_websockets`: Live authenticated client count.
   - `total_websocket_connects` / `total_websocket_disconnects`.
   - `websocket_auth_failures`: Counter for expired or malformed ticket attempts.
3. **Event Pipeline & Outbox:**
   - `ingested_events_total`: Total sensor events processed.
   - `ingestion_errors_total`: Validation and oversized payload rejections.
   - `outbox_committed_total` / `outbox_published_total`.
   - `last_cursor`: Highest monotonic cursor persisted.
   - `outbox_backlog_count`: Current unconfirmed event queue depth.
4. **SOC Analytics & Intelligence:**
   - `detection_runs_total`: Detection pipeline executions.
   - `threat_intel_lookups_total` / `threat_intel_hits_total`.
   - `alerts_evaluated_total` / `alerts_created_total`.
5. **Error Classification Counters:**
   - Categorizes failures into `INGESTION_ERROR`, `WEBSOCKET_AUTH_FAILED`, `INTERNAL_EXCEPTION`, `DATABASE_TIMEOUT`.

---

## 3. Metrics Exposition Endpoints

Accessible via `GET /api/v1/system/metrics` (Requires `system:view` permission):
- **JSON Format (Default):** Returns full structured snapshot of all counters and latency percentiles.
- **Prometheus Standard:** When requested via `?format=prometheus` or `Accept: text/plain`, returns standard Prometheus exposition format:
  ```text
  # HELP honeyshield_uptime_seconds Platform uptime in seconds
  # TYPE honeyshield_uptime_seconds gauge
  honeyshield_uptime_seconds 324.5

  # HELP honeyshield_active_websockets Current active authenticated WebSockets
  # TYPE honeyshield_active_websockets gauge
  honeyshield_active_websockets 2

  # HELP honeyshield_outbox_cursor Authoritative monotonic cursor sequence
  # TYPE honeyshield_outbox_cursor gauge
  honeyshield_outbox_cursor 1048
  ```

