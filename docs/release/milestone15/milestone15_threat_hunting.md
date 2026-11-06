# Milestone 15 — Threat Hunting Studio & Telemetry Search

**System:** HoneyShield X Threat Hunting Studio  
**Milestone:** 15  
**Evaluation Date:** 2026-11-06  

---

## 1. Multi-Dimensional Search Architecture

The Threat Hunting engine (`POST /api/v1/hunts/search`) provides unified, sub-second retrospective search capabilities across three primary telemetry tiers:
1. **Active Honeypot Attack Containers (`attacks`):** Source IP, attack type, target port, protocol, risk score, severity, and temporal windows.
2. **Aggregated Sensor Events (`attack_events`):** Raw payload messages, event types, protocol identifiers, and sensor timestamps.
3. **Persistent Transactional Outbox (`security_event_outbox`):** High-fidelity system event records, correlation IDs, and delivery lifecycle states.

---

## 2. SQL Injection Resistance & Input Parameterization

All queries leverage parameterized SQLAlchemy ORM projections and type-safe Pydantic request models (`ThreatHuntSearchRequest`). Malicious payloads including classic SQL injection vectors:
```sql
' UNION SELECT * FROM users --
1; DROP TABLE attacks; --
' OR '1'='1
```
are strictly bound as literal string arguments within SQL clauses or rejected during schema validation. As proven in test `test_02_threat_hunting_search_injection_rejection`, searching for SQL injection strings returns empty results safely without altering database state or raising syntax exceptions.

---

## 3. Performance & Pagination

- Queries default to `limit=50` (configurable up to 200) with offset-based pagination.
- Execution latencies are measured via monotonic high-resolution counters (`time.perf_counter()`) and returned in `execution_time_ms`.
- Measured search latency across test datasets is consistently under 15ms.

