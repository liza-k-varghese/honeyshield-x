# HONEYSHIELD X — DISTRIBUTED DEDUPLICATION & DURABLE IDEMPOTENCY
## Architectural Specification, Dual-Tier Implementation & Concurrency Verification

**Document Reference:** `HSX-SYS1-DOC-DISTRIBUTED-DEDUP`  
**Classification:** Distributed Systems Reliability & Data Integrity  
**Branch:** `system1-final-security-closure`  
**Target Subsystem:** `backend/app/system2_integration/service.py` & PostgreSQL Ledger  
**Date:** 2026-11-11  

---

### 1. Problem Statement & Risk Diagnosis

In high-throughput sensor telemetry architectures, network retries, packet replication, and distributed sensor relays frequently produce duplicate event submissions.

In the initial implementation:
1. Deduplication relied on an in-memory `OrderedDict` (`_dedup_cache`). Under multi-worker process configurations (e.g. 2 uvicorn workers in staging), duplicate requests arriving at different workers bypassed deduplication, resulting in duplicate attack records.
2. In the intermediate fix, a Redis cache key with a 300-second TTL was introduced. While this provided cross-worker synchronization, it suffered from a fundamental flaw: **ephemeral idempotency**. Once the 300-second TTL elapsed, or if Redis restarted/flushed, duplicate events were re-processed and duplicated in the primary database.

---

### 2. Dual-Tier Durable Idempotency Architecture

To achieve true, permanent exactly-once semantics, HoneyShield X implements a two-tier durable idempotency ledger:

```
[System 2 Sensor Event]
          │
          ▼
┌──────────────────────────────────────────────┐
│  Tier 1: Redis Fast-Path Cache (< 1ms)       │
│  Key: hsx:system2:dedup:{event_id}           │
└──────────────────────┬───────────────────────┘
          │ (Cache Miss or Redis Unavailable)
          ▼
┌──────────────────────────────────────────────┐
│  Tier 2: PostgreSQL Durable Ledger           │
│  Table: system2_ingested_events              │
│  Constraint: UNIQUE(event_id)                │
└──────────────────────┬───────────────────────┘
          │ (New Event)
          ▼
┌──────────────────────────────────────────────┐
│  Transactional Pipeline Execution            │
│  - Normalized Event Creation (AttackEvent)   │
│  - Attack Container Binding (Attack)         │
│  - Dual Detection Rules Evaluation           │
│  - Security Alert Dispatch (Alert)           │
│  - Durable Ledger Commit                     │
└──────────────────────────────────────────────┘
```

#### Tier 1: Distributed Fast-Path (Redis)
- Provides microsecond-level response times for near-immediate duplicate retransmissions.
- Cached payload stores the exact previously generated JSON response (`attack_id`, `alert_id`, `status: deduplicated`).
- Graceful degradation: If Redis is unavailable, the service automatically falls back to local LRU memory and Tier 2 durable database verification without dropping traffic.

#### Tier 2: Relational Ledger Guarantee (PostgreSQL)
- Schema: Defined by SQLAlchemy model `System2IngestedEvent` in `backend/app/models.py`.
- Enforces an absolute, database-level unique constraint on `event_id` (`VARCHAR(128) UNIQUE NOT NULL`).
- Foreign Keys: `attack_id` (ON DELETE CASCADE), `attack_event_id` (ON DELETE CASCADE), `alert_id` (ON DELETE SET NULL).
- Durability: Survives Redis TTL expiration, Redis flushes, system restarts, and years of operations.

#### Concurrency & Race-Condition Safety
When concurrent workers or threads attempt to insert the same `event_id` simultaneously:
1. One worker successfully commits the transaction.
2. The second worker triggers a PostgreSQL `IntegrityError` (UniqueViolation on `system2_ingested_events_event_id_key`).
3. The exception handler catches `IntegrityError`, immediately executes `db.rollback()`, and queries the ledger for the committed record to return the original idempotent response with HTTP 200.

#### Anomaly Detection on Conflicting Re-use
If an attacker or corrupted sensor attempts to reuse an existing `event_id` with different payload attributes (e.g. mismatched source IP or sensor type), the service detects the discrepancy, logs a security warning, and preserves the integrity of the original event.

---

### 3. Empirical Test Matrix

A dedicated test suite was constructed at `backend/tests/test_system2_distributed_deduplication.py`:

| Test Name | Test Objective | Assertion | Result |
| :--- | :--- | :--- | :--- |
| `test_01_deduplication_within_active_window` | Near-immediate retransmission | Returns HTTP 200 `status: deduplicated`, same `attack_id`, no duplicate `Attack` row | **PASSED** |
| `test_02_deduplication_after_redis_cache_expiry` | Event re-submitted after Redis key deleted | Recognized by PostgreSQL ledger, returned `deduplicated` | **PASSED** |
| `test_03_deduplication_under_complete_redis_outage` | Ingestion with Redis client set to `None` | Database ledger handles deduplication seamlessly | **PASSED** |
| `test_04_concurrent_duplicate_submission_race` | 5 concurrent threads submitting same event | Exactly 1 `Attack` row created; 0 unhandled exceptions; all threads receive valid responses | **PASSED** |
| `test_05_conflicting_event_payload_with_reused_id` | Reusing event ID with forged source IP | Discrepancy logged; original attack record preserved unmodified | **PASSED** |
| `test_06_event_acknowledgement_semantics` | Contract validation of acknowledgement response | Contains `deduplicated: True`, matching `event_id` | **PASSED** |

**Execution Result:** `6 passed in 0.97s`
