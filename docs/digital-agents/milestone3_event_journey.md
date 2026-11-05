# HoneyShield X — Digital Agent Universe
## Milestone 3 Signature Feature: HONEYSHIELD EVENT JOURNEY

### 1. Concept & Requirements
The **HONEYSHIELD EVENT JOURNEY** is the signature timeline component of HoneyShield X. It provides SOC analysts and operators with a step-by-step reconstruction of how any real security event or attack progressed through the platform.

Instead of displaying generic success checkmarks or fabricated animations, the Event Journey strictly reflects verified database records and lifecycle signals from the PostgreSQL event outbox (`security_event_outbox`).

---

### 2. The 11-Stage Canonical Pipeline

The HoneyShield X event lifecycle is represented across 11 canonical stages:

1. **Source Sensor Capture (SCOUT)**: Telemetry captured at Cowrie SSH honeypot or canary token trap.
2. **Ingestion API Gateway (NEXUS)**: Reception by FastAPI gateway with bearer token authentication.
3. **Schema Validation (NEXUS)**: Pydantic schema validation against `TransferLifecycleEvent`.
4. **ECS Normalization (NEXUS)**: Transformation into Elastic Common Schema compliant fields.
5. **Redis Queue Buffering (NEXUS)**: Non-blocking in-memory buffering in `hsx:events:stream`.
6. **Worker Stream Processing (NEXUS)**: Background worker consumption and deduplication.
7. **PostgreSQL Outbox Commit (NEXUS)**: Transactional persistence with monotonic cursor generation.
8. **Attack Detection Core (ORACLE)**: Detection rule evaluation and attack session correlation.
9. **Threat Intel Enrichment (ORACLE)**: IOC matching, threat actor attribution, and risk scoring.
10. **Confirmed Alert Triage (SENTINEL)**: Alert evaluation, threshold verification, and quiet-hours filtering.
11. **Push Dispatch & Governor (SENTINEL)**: WebSocket broadcast to web dashboards and mobile dispatch to paired Android devices.

---

### 3. Honest Status Transparency: NOT RECORDED States
The component explicitly refuses to manufacture completed states:
- If a stage did not occur (e.g. an event was informational and did not trigger an alert), it is marked **`NOT RECORDED`** or **`NOT AVAILABLE`**.
- If AI inference was not executed for an event, the stage displays `NOT RECORDED` with details: `"No generative AI inference feed configured for this event"`.
- Real recorded latencies are displayed in milliseconds (e.g. `14ms`, `22ms`), calculated strictly from adjacent ISO 8601 timestamps. When calculable duration is absent, it renders `N/A`.

---

### 4. Interactive "Follow Carrier" Integration
A dedicated action button in the Event Journey allows operators to click **"Follow Carrier in Cyber Universe"**, which shifts focus to the corresponding territory in the Cyber Universe or Movement Prototype, tracking the agent as it traverses the data transfer path.

