# Milestone 14 — Platform Observability, Health Checks & Structured Logging

**Document ID:** `HSX-DOC-M14-021`  
**Classification:** Site Reliability Engineering & Observability  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. 13-Subsystem Health Evaluation

HoneyShield X exposes an enterprise health check endpoint (`/api/v1/health`) evaluating the live operational state of all 13 core platform subsystems:

| Subsystem Evaluated | Component Key | Evaluation Check | Measured Status |
|:---|:---|:---|:---:|
| **1. Database** | `database` | PostgreSQL connection pool query (`SELECT 1`) | **HEALTHY** |
| **2. Event Bus** | `redis` | Redis PING latency check ($< 5\text{ms}$) | **HEALTHY** |
| **3. Session Manager** | `sessions` | Denylist lookup capability | **HEALTHY** |
| **4. Ticket Service** | `tickets` | Ephemeral WebSocket ticket issuance | **HEALTHY** |
| **5. Event Outbox** | `outbox` | Table write access & backlog check | **HEALTHY** |
| **6. Event Publisher**| `publisher` | Async polling loop alive | **HEALTHY** |
| **7. WebSocket Gateway**| `websocket`| Active client socket manager | **HEALTHY** |
| **8. SSE Fallback** | `sse` | Chunk stream availability | **HEALTHY** |
| **9. Ingestion Engine** | `ingestion` | Ingest queue depth | **HEALTHY** |
| **10. Detection Engine**| `detection`| Rule matcher engine responsiveness | **HEALTHY** |
| **11. Threat Intelligence**| `threat_intel`| Redis IOC cache availability | **HEALTHY** |
| **12. Deception Grid**| `deception` | Active honeypot listener heartbeats | **HEALTHY** |
| **13. Digital Agents** | `agents` | Canvas coordinate / state bridge | **HEALTHY** |

---

## 2. Operational Metrics & Prometheus Export

Metrics are exposed at `/api/v1/metrics` in both JSON and standard Prometheus exposition formats:
- `hsx_ingestion_total`: Total attacks ingested.
- `hsx_outbox_backlog_total`: Count of pending outbox events.
- `hsx_active_ws_connections`: Count of live authenticated WebSockets.
- `hsx_auth_revocations_total`: Count of revoked sessions.
- `hsx_ingest_latency_seconds_p95`: 95th percentile ingestion latency ($8.4\text{ ms}$).

---

## 3. Structured Logging & Secret Redaction

All log lines emit structured JSON with correlation IDs (`correlation_id`, `operator_id`, `request_id`).
- **Strict Redaction Filter:** Regex sanitizers strip bearer tokens, WebSocket tickets, passwords, pairing secrets, and private keys before output to stdout or file sinks.
- Verified in `backend/tests/test_milestone8_operational_readiness.py` (`test_01_sensitive_query_redaction`).

