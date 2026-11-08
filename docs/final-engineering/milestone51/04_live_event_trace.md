# Milestone 51 — Deliverable 04: Live Event Pipeline Provenance & Trace Audit

**Release Candidate:** `v1.0.0-rc5`  
**Host Target:** FastAPI 0.141.1 (`127.0.0.1:8000`) &rarr; PostgreSQL 17 &rarr; Redis 7  
**Audit Standard:** Strict End-to-End Event Provenance  
**Status:** **BACKEND & STREAMING VERIFIED / LIVE DESKTOP RECEPTION: PENDING WITNESS**  

---

## 1. Five-Tier Ingestion Pipeline Provenance

To eliminate ambiguity between backend persistence and frontend visual observation, the live event flow is audited across all five tiers:

```
[ Tier 1: Ingestion Request ] ──► POST /api/v1/ingestion/events (Attack ID 9307)
              │
              ▼
[ Tier 2: DB Outbox Commit ]  ──► PostgreSQL 17 security_event_outbox (Records 817, 818, 819)
              │
              ▼
[ Tier 3: Redis Publication ] ──► PUBLISH security_events / XADD security_events_stream
              │
              ▼
[ Tier 4: WebSocket Transport ]► WS /api/v1/events/stream (JSON Event Envelope)
              │
              ▼
[ Tier 5: Browser Rendering ] ──► React Component State & Relay Animation Trigger
```

---

## 2. Empirical Verification of Outbox Records 817–819

A test sensor event was transmitted to `http://127.0.0.1:8000/api/v1/ingestion/events` on `2026-11-08 03:31:18 UTC`:

### Raw Database Verification (Direct SQL Query)
```sql
SELECT id, event_id, event_type, resource_id, severity, correlation_id, payload_json, created_at 
FROM security_event_outbox 
WHERE id IN (817, 818, 819) 
ORDER BY id ASC;
```

**Retrieved Records:**
1. **Record ID 817:**
   - **Event Type:** `scout.collection_completed`
   - **Severity:** `info`
   - **Agent Payload:** `{"_agent": "SCOUT", "source_ip": "198.51.100.77", "sensor_id": "sensor-lab-m42"}`
   - **Created At:** `2026-11-08 03:31:18.796500`
2. **Record ID 818:**
   - **Event Type:** `handoff.scout_to_nexus`
   - **Severity:** `info`
   - **Agent Payload:** `{"_agent": "SCOUT", "target_agent": "NEXUS"}`
   - **Created At:** `2026-11-08 03:31:18.797317`
3. **Record ID 819:**
   - **Event Type:** `nexus.normalization_completed`
   - **Severity:** `info`
   - **Agent Payload:** `{"_agent": "NEXUS", "normalized": true}`
   - **Created At:** `2026-11-08 03:31:18.798032`

---

## 3. Provenance & Delivery Status by Tier

| Pipeline Tier | Verification Method | Status | Evidence Reference |
| :--- | :--- | :--- | :--- |
| **Tier 1: Ingestion API** | Live HTTP POST curl | **VERIFIED (PASS)** | HTTP 200 OK, Attack ID 9307 |
| **Tier 2: Outbox Commit** | Direct SQL inspection | **VERIFIED (PASS)** | PostgreSQL records 817, 818, 819 |
| **Tier 3: Redis Pub/Sub** | Backend unit tests | **VERIFIED (PASS)** | `test_digital_agent_live_events.py` (9/9 passed) |
| **Tier 4: WebSocket Push** | Stream integration tests | **VERIFIED (PASS)** | `test_milestone6_1_stream_security.py` (14/14 passed) |
| **Tier 5: Live UI Animation** | Headless screenshot capture | **PARTIAL (PENDING OPERATOR)** | Parameter-seeded render verified; live attack visual pulse pending interactive witness |

---

## 4. Operator Verification Step for Tier 5

To complete 100% end-to-end verification through Tier 5:
1. Operator opens [`http://127.0.0.1:5173/?view=universe`](http://127.0.0.1:5173/?view=universe) in Firefox.
2. In a terminal, send a live test attack:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/ingestion/events \
     -H "Content-Type: application/json" \
     -d '{"timestamp":"2026-11-08T04:00:00Z","source_ip":"198.51.100.99","dest_ip":"10.0.0.1","protocol":"SSH","sensor_id":"sensor-operator-test","event_type":"live_witness_event","payload":"Operator live test","raw_data":{}}'
   ```
3. Observe the green live pulse indicator and verify that SCOUT triggers an ingestion pulse in the browser.
