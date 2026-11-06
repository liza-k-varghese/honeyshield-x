# Milestone 11 — Historical Event Replay & Monotonic Deduplication

**Component:** Historical Replay Engine & Reconnection Gateway  
**Endpoint:** `GET /api/v1/events/replay?since_cursor=<int>&limit=<int>`  
**Verification Status:** VERIFIED & HARDENED  

---

## 1. Replay Architecture & Query Semantics

When a disconnected frontend or mobile client reconnects, it presents its highest successfully acknowledged cursor via `since_cursor`.

1. **Database Query:** Executes `SELECT * FROM security_event_outbox WHERE id > :since_cursor ORDER BY id ASC LIMIT :clamped_limit`.
2. **Buffer Fallback:** If PostgreSQL is transiently unreachable, queries the in-memory circular ring buffer (`self._buffer`) preserving FIFO ordering.
3. **RBAC Filtering:** Every replayed event is passed through `can_operator_view_event(operator, event_type)`. Restricted administrative events (e.g. `governor.containment.executed`) are stripped for non-admin operators.
4. **Pagination Controls:** Returns `(events, next_cursor, has_more)` where `next_cursor` represents the maximum cursor in the current slice.

## 2. Test Execution Evidence
- In `test_07_cursor_replay_monotonicity_and_deduplication`, consecutive events `e1` and `e2` were replayed with `since_cursor=c0`.
- Verified that all replayed cursors were strictly monotonic (`cursors == sorted(cursors)`), with zero duplicate entries and zero skipped database transactions.

