# Milestone 13 — Unified Architecture & Real-Time Event Topology

**Document:** `milestone13_architecture.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. End-to-End Platform Topology

The HoneyShield X enterprise platform unifies Web SOC monitoring, active deception, threat intelligence, and mobile operations around a shared event outbox:

```
[Decoy / Canary / Sensor]
           | (JSON Telemetry Payload)
           v
+--------------------------------------------------------------------------+
|                        FastAPI Ingestion Gateway                         |
|  - Validates Source & Schema                                             |
|  - Normalizes Event & Derives Authoritative Event Envelope               |
+--------------------------------------------------------------------------+
           |                                  |
           v                                  v
+---------------------+            +---------------------------------------+
|  Detection Engine   |            | PostgreSQL Transactional Outbox       |
|  - Multi-Vector     |            | - Monotonic BigSerial Sequence IDs    |
|  - Risk Scoring     |            | - Strict Atomic Commit / Rollback     |
|  - STIX Correlation |            +---------------------------------------+
+---------------------+                               |
           |                                          v
           v                               +--------------------+
+---------------------+                    | Redis Pub/Sub Bus  |
| Confirmed SOC Alert |                    | - Fanout Gateway   |
| - High Severity     |                    +--------------------+
| - Linked Attack ID  |                               |
+---------------------+                               v
           |                      +---------------------------------------+
           |                      | Real-Time Communication Hub           |
           |                      | - WebSocket: /ws/events (Tickets)     |
           |                      | - SSE Fallback: /events/stream (Auth) |
           |                      +---------------------------------------+
           |                                  |               |
           +-----------------+----------------+               |
                             |                                v
                             v                +-------------------------------+
        +----------------------------+        | Android Mobile Operations     |
        | Web Command Center         |        | - DigitalAgentStatusPanel     |
        | - Digital Agent Universe   |        | - Alerts Inbox & Attack Probe |
        |   (SCOUT, NEXUS, ORACLE,   |        | - Deception & Threat Intel    |
        |    SENTINEL Cubic Courier) |        | - Governor Containment Safe   |
        +----------------------------+        +-------------------------------+
```

---

## 2. Shared Authoritative Identifiers

All subsystems share strict immutable identifiers across the entire lifecycle:
- `workflow_id`: Global correlation key (e.g., `wf_m13_cross_platform_001`).
- `attack_id`: Persistent integer ID assigned by the database `attacks` table.
- `alert_id`: Persistent integer ID assigned by the database `alerts` table.
- `transfer_id`: Discrete handoff key between agents (e.g., `tr_scout_1`, `tr_nexus_1`).
- `outbox_cursor`: Monotonic integer sequence ID determining stream replay position.

