# MILESTONE 65 — POSTGRESQL, REDIS & TRANSACTIONAL EVENT INTEGRITY

**Directory:** `docs/final-engineering/milestones62-75/65_postgresql_redis/`  
**Target Subsystems:** PostgreSQL 17, Redis 7, SQLAlchemy Engine, Monotonic Outbox  
**Evaluation Gates:** G21, G22, G23, G24, G25, G28, G29, G30  

---

## 1. POSTGRESQL 17 ACID TRANSACTION ARCHITECTURE

HoneyShield X uses PostgreSQL 17 as its authoritative data store, operating with `psycopg` (v3) connection pooling in SQLAlchemy:

```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)
```

### Transaction Boundaries & Outbox Commit Pattern:
When a security event is ingested:
1. Ingestion transaction begins.
2. `Attack` container and `AttackEvent` records are written.
3. Digital Agent Lifecycle event is published and staged into `SecurityEventOutbox`.
4. Handoff event (`handoff.scout_to_nexus`) is staged into `SecurityEventOutbox`.
5. Atomic commit: All entities commit simultaneously.
6. If any failure occurs during normalization or validation, `db.rollback()` executes, guaranteeing zero dangling or orphaned records.

---

## 2. OUTBOX CURSOR MONOTONICITY & REPLAY GUARANTEE

The `security_event_outbox` table schema ensures deterministic event ordering:

```sql
CREATE TABLE public.security_event_outbox (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' NOT NULL,
    schema_version VARCHAR(10) DEFAULT '1.0' NOT NULL,
    payload_json TEXT NOT NULL,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
);
```

- **Monotonic Cursors:** Sequence ID `id` provides an immutable, monotonically increasing cursor.
- **Client Reconciliation:** Reconnecting clients supply `lastCursor` (`outbox.cursor.#XXXX`); the server replays subsequent events without duplicate transmission or dropped packets.
- **Deduplication:** `event_id` is unique, preventing double insertion.

---

## 3. REDIS 7 PUB/SUB BROADCASTING & MULTI-WORKER RESILIENCE

- **Pub/Sub Channel:** Normalized outbox envelopes are pushed to Redis channel `honeyshield:events`.
- **Worker Scaling:** Multiple FastAPI workers subscribe to the channel, delivering events to their respective WebSocket connections.
- **Fault Tolerance:** If Redis restarts, the event bridge reconnects with exponential backoff and synchronizes with PostgreSQL outbox cursors.

---

## 4. VERIFICATION RESULTS

- PostgreSQL 17 active connection verified on `127.0.0.1:5432`.
- Redis 7 active socket connection verified on `127.0.0.1:6379`.
- Outbox event sequence verified: Monotonically increasing from historical records (`1491`–`1496`) through Milestone 62/74 verification events (`2075`–`2080`).
- System health query returned `{'api': 'healthy', 'postgresql': 'connected', 'redis': 'connected'}`.
