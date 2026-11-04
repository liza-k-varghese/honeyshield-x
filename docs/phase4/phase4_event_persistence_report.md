# HoneyShield X — Phase 4 Persistent Event Outbox & Storage Report

**Document ID:** `HSX-DOC-P4-004`  
**Phase:** 4 — Event Durability & Outbox Architecture  
**Date:** 2026-11-04  
**Author:** Distributed Systems Architect & Backend Lead  
**Classification:** Internal Technical Standard  

---

## 1. Overview & Architectural Problem

In Phase 3, the real-time event pipeline utilized an in-memory `collections.deque` ring buffer with optional Redis stream mirroring. While high-performance, this approach had key limitations:
1. **Container / Worker Restarts:** In-memory cursors reset to zero on process restart, leading to missed events for offline clients.
2. **Crash Recovery:** Historical events generated prior to a worker crash were unrecoverable.
3. **Multi-Process Desynchronization:** Standalone workers maintaining independent in-memory buffers could assign conflicting cursor sequences.

---

## 2. PostgreSQL Transactional Outbox Pattern

Phase 4 introduces a durable PostgreSQL outbox model (`SecurityEventOutbox`) that acts as the single source of truth for all security events.

### 2.1 Database Schema (`security_event_outbox`)

```sql
CREATE TABLE security_event_outbox (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'info',
    schema_version VARCHAR(16) NOT NULL DEFAULT '1.0',
    payload_json TEXT NOT NULL DEFAULT '{}',
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_security_event_outbox_event_type ON security_event_outbox (event_type);
CREATE INDEX ix_security_event_outbox_severity ON security_event_outbox (severity);
CREATE INDEX ix_security_event_outbox_created_at ON security_event_outbox (created_at);
```

### 2.2 Dual-Tier Hybrid Architecture

```
[ Domain Subsystems (SOC / Alerts / Deception / Hunts) ]
                          │
                          ▼
            publish_security_event()
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
 [ PostgreSQL Outbox ]         [ In-Memory Ring Buffer ]
 (Single Source of Truth)       (Zero-Latency Sub-ms Cache)
          │                               │
          │ (Cursor = outbox.id)          ▼
          │                    [ WebSocket / SSE Broadcast ]
          ▼                               │
   [ Alembic Migration ]                  ▼
                               [ Mobile Push Dispatcher ]
```

---

## 3. Startup Hydration Engine (`_hydrate_from_db`)

When the FastAPI process initializes:
1. `EventStore` connects to PostgreSQL via `SessionLocal()`.
2. Evaluates `SELECT MAX(id) FROM security_event_outbox` to set `self._cursor_counter`.
3. Fetches the latest $N$ events (`ORDER BY id DESC LIMIT max_buffer`) and populates the in-memory ring buffer in chronological order.
4. If the database is temporarily unreachable, `EventStore` falls back gracefully to standalone in-memory operation without crashing.

---

## 4. Cursor Replay & Recovery

Clients recovering from offline states query:
`GET /api/v1/events/replay?since_cursor=1050&limit=50`

The endpoint queries PostgreSQL:
```sql
SELECT * FROM security_event_outbox
WHERE id > 1050
ORDER BY id ASC
LIMIT 51;
```

This ensures that mobile devices reconnecting after network loss receive every missed critical alert, canary hit, or incident update in exact sequence.

