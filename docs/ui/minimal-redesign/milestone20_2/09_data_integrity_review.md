# HONEYSHIELD X — MILESTONE 20.2 DATA INTEGRITY REPORT
## 09: AUTHORITATIVE DATA BINDINGS & ZERO-FABRICATION AUDIT

**Document Version:** 1.0.0-rc5  
**Audit Date:** 2026-11-07  
**Subsystem:** Backend API Aggregation & Telemetry Truth  

---

### 1. Authoritative Backend Telemetry Bindings

Milestone 20.2 rigorously verified that no fabricated or synthetic placeholder data was reintroduced during the visual refinement process.

| Metric | Sourcing Method | Handling When Data Missing | Status |
|---|---|---|---|
| **Critical Alerts** | Calculated from `alerts.filter(a => a.status === 'open' && (a.severity === 'critical' \|\| a.severity === 'high'))` | Displays `0 requiring triage` when empty; `Alerts Error` when fetch fails. | **VERIFIED TRUTHFUL** |
| **Monitored Threats** | Backend `DashboardStats.total_attacks` with fallback to `attacks.length`. | Displays `0 detected vectors`. | **VERIFIED TRUTHFUL** |
| **Unique Attacker IPs** | Backend sliding 24h count: `DashboardStats.unique_attacker_ips_24h`. | Falls back to distinct IPs present in monitored attacks. | **VERIFIED TRUTHFUL** |
| **Deception Sensors** | Dynamically derived from `stats.sensor_health` backed by backend `check_honeypots_health()`. | Displays `0 Traps - No Sensors Registered` or `Sensor Health — Unavailable`. | **VERIFIED TRUTHFUL** |
| **Events Processed (24h)** | Authoritative query on `SecurityEventOutbox` and `AttackEvent` within sliding 24h UTC window. | Honestly labeled as `Events Received (Session)` if persistent count is absent. | **VERIFIED TRUTHFUL** |
| **Infrastructure Health** | Directly reads `stats.system_health` (API, PostgreSQL, Redis). | Explicitly marked `INFRASTRUCTURE OFFLINE` when telemetry is unreachable. | **VERIFIED TRUTHFUL** |
| **Operator Identity** | Sourced from authenticated session `operator.username` and `operator.role`. | Bound to JWT/session claims; zero hardcoded user strings. | **VERIFIED TRUTHFUL** |

---

### 2. Dual-Mode Event Processing Metric Code Verification

In `frontend/src/components/SecurityOverview.tsx`:
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
This guarantees complete transparency between historical database records and ephemeral WebSocket stream packets.

