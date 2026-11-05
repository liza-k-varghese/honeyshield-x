# HoneyShield X — Digital Agent Universe
## Milestone 5: Event Contracts, Storage & API Reconciliation Report

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Target:** Database Schemas, API Routing, Event Envelopes, Replay Conventions  
**Status:** RECONCILED & STANDARDIZED WITH BACKWARD COMPATIBILITY

---

## 1. Executive Summary & Purpose

Section 8 of the Milestone 5 directive mandated a rigorous audit to identify and reconcile naming and contract discrepancies across the platform:
- `security_event_outbox` versus `event_outbox`.
- Differences between ingestion route paths (`/ingestion` vs `/ingest`).
- Different WebSocket and replay cursor parameter conventions (`since_cursor`, `last_id`, `cursor`).

This report provides the authoritative reconciliation, document corrections, and details the backward-compatible implementations deployed to ensure zero breaking changes across frontend, backend, and external integrations.

---

## 2. Table Name Reconciliation: `security_event_outbox`

### 2.1 Authoritative Database Contract
- **PostgreSQL Table Name:** `security_event_outbox`
- **SQLAlchemy Model:** `SecurityEventOutbox` (defined in `backend/app/models.py`, Line 105):
  ```python
  class SecurityEventOutbox(Base):
      __tablename__ = "security_event_outbox"
      id = Column(Integer, primary_key=True, index=True)
      event_id = Column(String(64), unique=True, index=True, nullable=False)
      event_type = Column(String(64), index=True, nullable=False)
      resource_id = Column(String(64), index=True, nullable=True)
      payload = Column(JSON, nullable=False)
      created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
  ```
- **Alembic Migration:** `f3b890123456_create_security_outbox_and_pairing_tables.py` establishes the table schema with indexes on `id`, `event_id`, `event_type`, `resource_id`, and `created_at`.

### 2.2 Discrepancy & Resolution
- **Identified Discrepancy:** Certain earlier documentation and comments loosely referenced `event_outbox`.
- **Resolution:**
  - The authoritative production database table remains `security_event_outbox`.
  - All documentation, comments, and frontend adapter descriptions have been updated to reference `security_event_outbox` consistently.
  - No database migration or table renaming was necessary, preventing schema churn or data loss.

---

## 3. Ingestion API Route Reconciliation

### 3.1 Primary Authoritative Routes
The core ingestion router (`backend/app/routers/ingestion.py`) mounts with prefix `/ingestion`:
- `POST /api/v1/ingestion/events` — Primary endpoint for normalized events.
- `POST /api/v1/ingestion/honeypot` — Authoritative endpoint for raw sensor/honeypot telemetry.

### 3.2 Backward-Compatible Aliases
To support clients, scripts, and documentation referencing `/api/v1/ingest`:
- A backward-compatible alias router (`ingest_alias_router`) was mounted in `backend/app/main.py`:
  - `POST /api/v1/ingest/events` $\to$ delegates to `ingest_event(...)`.
  - `POST /api/v1/ingest/honeypot` $\to$ delegates to `ingest_event(...)`.

### 3.3 Verification
Verified via automated test `test_09_contract_reconciliation_aliases` in `backend/tests/test_digital_agent_live_events.py`:
- `POST /api/v1/ingestion/events` returns HTTP 201 Created.
- `POST /api/v1/ingest/events` returns HTTP 201 Created.
- `POST /api/v1/ingest/honeypot` returns HTTP 201 Created.

---

## 4. Replay Cursor & WebSocket Convention Reconciliation

### 4.1 Replay Query Parameters
The replay endpoint (`GET /api/v1/events/replay`) provides cursor-based event recovery for reconnecting clients.

- **Authoritative Parameter:** `since_cursor: int | None`
- **Reconciled Aliases:**
  ```python
  @router.get("/replay", response_model=EventReplayResponse)
  def replay_events(
      since_cursor: int | None = Query(default=None),
      cursor: int | None = Query(default=None),
      last_id: int | None = Query(default=None),
      limit: int = Query(default=50, ge=1, le=200),
      operator: Operator = Depends(get_current_operator),
      db: Session = Depends(get_db),
  ) -> EventReplayResponse:
      effective_cursor = since_cursor if since_cursor is not None else (cursor if cursor is not None else last_id)
      clean_cursor = effective_cursor if isinstance(effective_cursor, int) else None
  ```
Clients passing `?since_cursor=X`, `?cursor=X`, or `?last_id=X` are now handled identically and deterministically.

### 4.2 WebSocket Cursors
- **Welcome Frame:** Emits `"current_cursor": default_event_store.current_cursor` upon handshake.
- **Heartbeat & Pong Frame:** Emits `"cursor": default_event_store.current_cursor` on ping/pong keepalives.
- **Frontend Event Adapter:** `BackendEventAdapter.ts` now inspects `raw.cursor || raw.since_cursor || raw.last_id` seamlessly.

---

## 5. Transaction Boundaries & Outbox Atomicity

A critical platform requirement is that lifecycle events and courier animations are emitted only **after** persistent database transactions succeed:

```python
# In backend/app/routers/ingestion.py:
db.add(db_event)
db.commit()      # 1. Commit event record to database
db.refresh(db_event)

# 2. Emit lifecycle events only AFTER transaction is successfully committed
publish_lifecycle_event(
    agent="SCOUT",
    stage="collection",
    status="completed",
    ...
    db=db,
)
```

If `db.commit()` raises an exception (e.g. unique constraint violation or storage timeout), the exception propagates immediately, preventing phantom courier movements.

