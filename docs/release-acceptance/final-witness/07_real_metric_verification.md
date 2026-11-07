# HoneyShield X — Final Release Witness: Honest Metric Verification & Data Provenance

**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** Post-Milestone 24 Evidence Closure & Audit  

---

## 1. Provenance Audit: What are `2,847` and `1,420`?

In acceptance reports, numbers such as `2,847` and `1,420` appeared as examples of operational throughput.

### Empirical Data Provenance Investigation:

```
+-----------------------------------------------------------------------------------------+
|                               METRIC PROVENANCE AUDIT                                   |
+-----------------------------------------------------------------------------------------+
| METRIC 1: "2,847 Events Processed (24h)"                                                |
| - Origin: frontend/src/tests/milestone21_e2e_flows.test.tsx: mockStats.events_processed_24h|
| - Provenance Type: Test Fixture Seed for 24-hour persistent database aggregate.         |
| - Live Backend Behavior: In a newly deployed database with only integration test events,|
|   the actual database query `SELECT COUNT(*) FROM attacks` returns 1 (or 2).            |
| - UI Handling: SecurityOverview renders `stats.events_processed_24h` ONLY when the DB   |
|   returns an integer; otherwise it cleanly falls back to streamMetrics.                 |
+-----------------------------------------------------------------------------------------+
                                             vs.
+-----------------------------------------------------------------------------------------+
| METRIC 2: "1,420 Events Received (Session)"                                             |
| - Origin: frontend/src/tests/milestone21_e2e_flows.test.tsx: mockStreamMetrics.totalReceived|
| - Provenance Type: Active In-Memory WebSocket Session Counter.                          |
| - Live Backend Behavior: Increments dynamically by 1 for each incoming JSON frame over  |
|   the authenticated WebSocket stream (/api/v1/agents/ws/stream).                        |
| - UI Handling: Displayed as "Events Received (Session)" with subtext "live WebSocket     |
|   session stream" whenever persistent 24h database records are unavailable.             |
+-----------------------------------------------------------------------------------------+
```

### Audit Determination:
Neither `2,847` nor `1,420` are hardcoded in the production React components. They originate from the unit test fixtures (`mockStats` and `mockStreamMetrics`) used to verify that the UI renders both persistent 24h aggregates and session stream counts accurately.

---

## 2. Live Dashboard Metric Mapping

Every number displayed on the production HoneyShield X dashboard has an authoritative backend source:

| Dashboard Element | Authoritative Backend Source | Derivation & Fallback Logic | Hardcoded? |
| :--- | :--- | :--- | :---: |
| **Critical Alerts** | `GET /api/v1/dashboard/stats` | `alerts.filter(a => a.severity === 'critical' \|\| a.severity === 'high').length` | **NO** |
| **Active Threats** | `GET /api/v1/dashboard/stats` | `stats?.total_attacks ?? attacks.length` | **NO** |
| **Sensor Health** | `GET /api/v1/dashboard/stats` | Evaluates `stats.sensor_health`: `active_canary_tokens` vs `unconfigured_sensors` | **NO** |
| **Events Metric** | `GET /api/v1/dashboard/stats` OR Stream | `stats?.events_processed_24h` (DB) OR `streamMetrics?.totalReceived` (Session) | **NO** |
| **Service Status** | `GET /api/v1/dashboard/stats` | Inspects `system_health.api`, `postgresql`, `redis`. 3 online &rarr; `3/3 SYSTEMS OPERATIONAL` | **NO** |
| **Operator Role** | Authenticated JWT Payload | Extracted from `useAuth().operator`: role badge and display name | **NO** |

---

## 3. Truthful Sensor Status Derivation

The deception platform dynamically calculates sensor readiness:
- **Staging / Initial Deployment:** Reports `Canary Active (5 Unconfigured)` with an amber warning badge.
- **Full Production Deployment:** Reports `6 / 6 All Sensors Healthy` with green indicator when all peripheral daemons are registered.
- **Service Disconnection:** Reports `Unavailable` with neutral slate badge when the backend telemetry service is unreachable.

Zero synthetic counts (`4/4 Traps Active`) remain in the codebase.

