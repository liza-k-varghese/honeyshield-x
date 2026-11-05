# HoneyShield X — Digital Agent Universe: Backend Event Mapping

**Document:** `docs/digital-agents/backend_event_mapping.md`  
**Phase:** Digital Agent Universe Implementation  
**Status:** COMPLETE & VERIFIED  
**Date:** November 4, 2026  

---

## 1. Event Adapter Specification

The `BackendEventAdapter` translates authoritative `SecurityEventEnvelope` records emitted by the backend SSE (`/api/v1/events/stream`) and WebSocket (`/api/v1/events/ws`) gateways into frontend animation data structures.

### Event Type to Agent & Route Matrix:

| Qualified Backend Event Type | Assigned Agent | Pipeline Route | Packet Color |
| :--- | :---: | :--- | :---: |
| `sensor.connection_detected` | **SCOUT** | Honeypot Sensors $\to$ Ingestion Gateway | **Blue** (`#3B82F6`) |
| `sensor.canary_tripped` | **SCOUT** | Honeypot Sensors $\to$ Ingestion Gateway | **Blue** (`#3B82F6`) |
| `ingest.event_received` | **NEXUS** | Ingestion Gateway $\to$ PostgreSQL Outbox | **Cyan** (`#00E5FF`) |
| `attack.created` | **NEXUS** | Ingestion Gateway $\to$ PostgreSQL Outbox | **Cyan** (`#00E5FF`) |
| `attack.escalated` | **NEXUS** | Ingestion Gateway $\to$ PostgreSQL Outbox | **Cyan** (`#00E5FF`) |
| `intel.ioc_matched` | **ORACLE** | Detection Engine $\to$ Threat Intel Store | **Purple** (`#A855F7`) |
| `intel.threat_enriched` | **ORACLE** | Detection Engine $\to$ Threat Intel Store | **Purple** (`#A855F7`) |
| `alert.created` | **SENTINEL** | Alert Evaluator $\to$ SOC Push & Governor | **Red** (`#EF4444`) |
| `alert.acknowledged` | **SENTINEL** | Alert Evaluator $\to$ Incident Management | **Green** (`#10B981`) |
| `governor.containment_staged` | **SENTINEL** | Governor Console $\to$ Active Response | **Red** (`#EF4444`) |

---

## 2. Event Deduplication & Backpressure Handling

To guarantee smooth rendering during high-volume event bursts (e.g. 500-event synthetic attacks):
1. **Deduplication Cache:** `BackendEventAdapter` maintains an LRU set of 500 event UUIDs. Duplicate frames emitted during SSE reconnects or WebSocket retries are ignored.
2. **Active Queue Capping:** The active in-flight packet array is bounded to a maximum of 20 concurrent packets. Stale or older packets transition automatically to the completed archive.
3. **Monotonic Cursor Reconciliation:** Incoming packets carry `cursor` integers matching `security_event_outbox.id`, ensuring total ordering across replayed streams.

