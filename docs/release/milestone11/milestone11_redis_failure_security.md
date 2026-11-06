# Milestone 11 — Redis Failure Security & Partition Resilience

**Component:** Redis Coordination Layer & Storage Failures  
**Verification Target:** Failure Injection & Partition Handling  

---

## 1. Failure Modes & Behavioral Matrix

| Failure Condition | Legacy Mode Behavior | Milestone 11 Hardened Mode (`STRICT_AUTH`) |
|---|---|---|
| **Redis Outage During Login** | Allowed local in-memory session (split-brain) | **FAILS CLOSED** (`RuntimeError`, HTTP 503) |
| **Redis Outage During Ticket Issue** | Allowed local in-memory ticket | **FAILS CLOSED** (`RuntimeError`, HTTP 503) |
| **Redis Outage During Active Streams** | In-memory stream continued without central pub/sub | Local subscribers continue; Zero-Trust checks registry on each broadcast frame |
| **Redis Recovery Post-Outage** | Required manual worker restart | Automatic auto-reconnect via `redis.Redis` connection pool |

## 2. Telemetry and Alarm Emission

When Redis connectivity degrades:
1. `auth_coordination_failures` metric is incremented.
2. System health subsystem `redis` reports `ServiceHealthStatus.DEGRADED` or `UNAVAILABLE`.
3. Health alarm `ALARM-REDIS-UNAVAILABLE` triggers with Level 2 on-call runbook link.

