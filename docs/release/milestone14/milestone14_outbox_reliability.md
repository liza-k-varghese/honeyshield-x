# Milestone 14 — Transactional Event Outbox Durability & Replay Ordering

**Document ID:** `HSX-DOC-M14-014`  
**Classification:** Database Reliability & Event Streaming  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Authoritative Outbox Pattern

To eliminate dual-write hazards between PostgreSQL persistence and Redis event broadcasting, HoneyShield X implements the **Transactional Outbox Pattern**:

```
[FastAPI Ingestion Endpoint]
    │
    ▼ (Begin Transaction)
├── 1. INSERT INTO attacks (...)
├── 2. INSERT INTO alerts (...)
└── 3. INSERT INTO security_event_outbox (cursor, event_id, event_type, payload, status)
    ▼ (Commit Transaction)
[PostgreSQL Database]
    │
    ▼ (Async Publisher Loop: SELECT * FROM security_event_outbox WHERE status='PENDING')
├── 4. Redis PUBLISH hsx:events:live <payload>
└── 5. UPDATE security_event_outbox SET status='PUBLISHED' WHERE id=...
```

---

## 2. Monotonic Cursors & Out-of-Order Commit Protection

1. **Sequential Integrity:** Outbox cursors use an auto-incrementing BigInteger sequence (`BIGSERIAL`).
2. **Delayed Commit Mitigation:** To prevent gaps where transaction $B$ (`cursor=2`) commits before transaction $A$ (`cursor=1`):
   - The publisher polls with a sliding boundary buffer ($T_{\text{commit}} - 50\text{ms}$).
   - Any gap detected in sequential cursors pauses the live pointer until the preceding transaction commits or expires.
3. **Delivery Semantics:** Guarantees **at-least-once delivery** with idempotent client event handlers. Clients deduplicate events by `event_id` and discard cursors $\le$ their local high-water mark.

---

## 3. Replay Verification

Verified in `scripts/verify_cross_platform_event_trace.py`:
- Cursors emitted: `1 -> 2 -> 3 -> 4`.
- Replay query `SELECT * FROM security_event_outbox WHERE cursor > 0 ORDER BY cursor ASC` reproduced the exact 4-stage progression without duplication or omission.
- Test in `backend/tests/test_milestone11_distributed_hardening.py` (`test_07_cursor_replay_monotonicity_and_deduplication`) passed 100%.

