# Milestone 29 — Live Backend Event Pipeline Integration

**Release Candidate:** `v1.0.0-rc5`  
**Architecture:** FastAPI REST Ingestion &rarr; PostgreSQL 17 `security_event_outbox` &rarr; Redis 7 Pub/Sub &rarr; Authenticated WebSocket Streaming  
**Target Endpoints:** `POST /api/v1/ingestion/events`, `WS /api/v1/events/stream`  
**Status:** **PASSED / VERIFIED**  

---

## 1. Pipeline Architecture

Milestone 29 establishes bidirectional correlation between backend cybersecurity events and frontend operational visualizations. When sensor telemetry or simulated attack vectors arrive at FastAPI, the event is evaluated by detection rules, mapped into an immutable security event envelope, committed to the PostgreSQL outbox, and broadcast through Redis to authenticated WebSocket clients.

```
 [Sensors / Honeypots / Ingestion API]
                 │
                 ▼
       POST /api/v1/ingestion/events
                 │
                 ▼
     [FastAPI Ingestion Router]
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
[Attacks Table]     [Rule Evaluation Engine]
    │                         │
    └────────────┬────────────┘
                 ▼
    [Lifecycle Outbox Publisher]
                 │
                 ├─► INSERT INTO security_event_outbox (PostgreSQL 17)
                 ├─► PUBLISH security_events (Redis 7)
                 └─► Broadcast to WebSocket clients (Vite / React)
```

---

## 2. Critical Bug Fix & Transaction Commit

During verification of the live ingestion pipeline, it was identified that `POST /api/v1/ingestion/events` invoked `publish_lifecycle_event()`, but because FastAPI's dependency injection session `get_db()` closes at request termination, uncommitted transaction rows were being discarded.

**Resolution in `backend/app/routers/ingestion.py`:**
```python
# Publish digital agent lifecycle events for SOC visualization
try:
    publish_lifecycle_event(
        db=db,
        event_type="scout.collection_completed",
        agent="scout",
        source="ingestion_pipeline",
        severity="info",
        payload={...}
    )
    # Explicit commit ensures Outbox records are persisted to PostgreSQL 17
    db.commit()
except Exception as outbox_err:
    db.rollback()
    logger.warning("Failed to emit scout outbox lifecycle event: %s", outbox_err)
```

---

## 3. End-to-End Verification Evidence

A live test event was posted to the running backend:
```bash
POST http://127.0.0.1:8000/api/v1/ingestion/events
Content-Type: application/json
{
  "timestamp": "2026-11-08T02:00:00Z",
  "source_ip": "192.168.1.105",
  "dest_ip": "10.0.0.1",
  "protocol": "SSH",
  "sensor_id": "sensor-01",
  "event_type": "ssh_brute_force_live",
  "payload": "Failed password for root",
  "raw_data": {"attempts": 3}
}
```

**Results:**
1. **HTTP Response:** `200 OK`, assigned Attack ID `9134`.
2. **PostgreSQL Outbox Table Verification:**
   - Record `ID 131`: `event_type = 'scout.collection_completed'`, `agent = 'scout'`, `status = 'pending'`.
   - Record `ID 132`: `event_type = 'handoff.scout_to_nexus'`, `agent = 'scout'`, `status = 'pending'`.
   - Record `ID 133`: `event_type = 'nexus.normalization_completed'`, `agent = 'nexus'`, `status = 'pending'`.
3. **Automated Backend Pytest:**
   `backend/tests/test_digital_agent_live_events.py` &rarr; **9 / 9 tests passed**.
