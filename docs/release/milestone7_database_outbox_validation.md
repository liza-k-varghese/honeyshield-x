# Milestone 7 — Transactional Outbox & Monotonicity Validation

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-05  

---

## 1. Architectural Intent

HoneyShield X uses the Transactional Outbox pattern (`security_event_outbox` table) to guarantee that security events, agent telemetry, and triage alerts are durably persisted to PostgreSQL **before** being broadcast over WebSocket/SSE to clients or queued for notification dispatch.

---

## 2. Model & Database Schema

Defined in `backend/app/models.py` and migration `f3b890123456_create_security_outbox_and_pairing_tables.py`:
- `id`: BigInteger auto-incrementing primary key (serves as the monotonic cursor).
- `event_id`: UUID unique string.
- `event_type`: String (e.g. `security.attack.detected`, `digital_agent.packet.courier_dispatched`).
- `cursor`: BigInteger indexed monotonic sequence.
- `operator_id`: Optional string for targeted RBAC delivery.
- `payload`: JSONB containing complete event envelope.
- `published_at`: UTC timestamp.

---

## 3. Transactional Correctness & Guarantees

1. **Commit-Before-Publish Semantics:**
   In `backend/app/routers/events.py` and `backend/app/pipeline.py`, database records are committed within a SQLAlchemy session block before notifying the in-memory pub/sub engine.
   If an unhandled exception or database rollback occurs, the event is aborted and **never** emitted to WebSocket subscribers.
2. **Strict Cursor Monotonicity:**
   Every event received by subscribers includes an incrementing integer `cursor`. Replay requests (`GET /api/v1/events/replay?from_cursor=X`) return events ordered strictly by `id ASC`.
3. **Replay Filtering & Authorization:**
   Events with sensitive system actions (e.g. containment commands) are filtered out during replay if the requesting operator lacks the required privileges (`test_04_outbox_replay_monotonic_cursor_enforcement`).

---

## 4. Test Evidence

- `backend/tests/test_digital_agent_live_events.py::test_02_outbox_persistence_and_cursor_monotonicity` (PASS)
- `backend/tests/test_milestone7_trust_boundaries.py::test_04_outbox_replay_monotonic_cursor_enforcement` (PASS)
- `backend/tests/test_phase3_realtime_and_push.py::test_05_cursor_based_event_replay` (PASS)

