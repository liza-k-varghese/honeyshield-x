# HONEYSHIELD X — MILESTONE 20.1 DATA INTEGRITY REPORT
## 03: 24-HOUR EVENT METRIC VS SESSION STREAM TELEMETRY

**Document Version:** 1.0.0-rc5  
**Audit Date:** 2026-11-07  
**Subsystem:** Metric Aggregation Engine & WebSocket Stream Bridge  

---

### 1. Root Cause Analysis: The Ephemeral Stream Flaw

In Milestone 20, the dashboard card labeled `Events Processed (24h)` evaluated:
```typescript
const eventsProcessedCount = useMemo(() => {
  return streamMetrics?.totalReceived ?? totalAttacksCount;
}, [streamMetrics, totalAttacksCount]);
```
This created a serious data integrity flaw:
1. `streamMetrics.totalReceived` starts at `0` upon browser reload or WebSocket connection establishment.
2. An operator opening the console at 14:00 UTC would observe `0 events ingested (24h)`, falsely implying zero malicious activity over the preceding 24 hours.
3. As live events arrived over the WebSocket, this session count incremented (e.g., `42`), leading the operator to believe that only 42 events had occurred platform-wide in the past day.

---

### 2. Architectural Solution: Dual-Mode Truthful Reporting

Milestone 20.1 implements an authoritative dual-mode model combining persistent database aggregation with honest fallback streaming semantics.

#### 2.1 Backend Aggregation (`backend/app/routers/dashboard.py`)
```python
# Calculate sliding 24-hour window from UTC now
window_start = datetime.now(timezone.utc) - timedelta(hours=24)

# Aggregate authoritative persistent event records
outbox_24h_count = db.query(func.count(SecurityEventOutbox.id)).filter(
    SecurityEventOutbox.created_at >= window_start
).scalar() or 0

attack_24h_count = db.query(func.count(AttackEvent.id)).filter(
    AttackEvent.created_at >= window_start
).scalar() or 0

events_processed_24h = outbox_24h_count + attack_24h_count
```

#### 2.2 Frontend Representation (`frontend/src/components/SecurityOverview.tsx`)
```typescript
const eventMetric = useMemo(() => {
  if (stats?.events_processed_24h !== undefined) {
    return {
      label: 'Events Processed (24h)',
      count: stats.events_processed_24h.toLocaleString(),
      subText: 'events ingested (24h UTC)',
      isPersistent: true,
    };
  }
  const sessionCount = streamMetrics?.totalReceived ?? totalAttacksCount;
  return {
    label: 'Events Received (Session)',
    count: sessionCount.toLocaleString(),
    subText: 'live WebSocket session stream',
    isPersistent: false,
  };
}, [stats?.events_processed_24h, streamMetrics, totalAttacksCount]);
```

---

### 3. Verification & Test Evidence

Vitest test cases in `frontend/src/tests/security_overview.test.tsx` verify both branches:
1. When `events_processed_24h: 12450` is present, the card renders `Events Processed (24h)` and `12,450`.
2. When `events_processed_24h` is omitted, the card renders `Events Received (Session)` and `884` with subtitle `live WebSocket session stream`.

