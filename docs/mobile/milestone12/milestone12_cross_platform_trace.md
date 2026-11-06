# Milestone 12 — Web-to-Android Cross-Platform Exercise (Scenarios A through Q)

**Document:** `milestone12_cross_platform_trace.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Cross-Platform End-to-End Trace (Scenarios A through Q)

The HoneyShield X cross-platform architecture was validated across 17 integrated operational scenarios spanning Web Command Center, Backend Outbox/Redis, and Mobile SOC application:

| Scenario | Operation / Trigger | Architectural Path | Verified Outcome |
|---|---|---|---|
| **Scenario A: Desktop Operator Login** | Operator authenticates on Web SOC | `POST /api/v1/auth/login` -> JWT access/refresh issue | Valid session token established; Web SOC Command Center loaded. |
| **Scenario B: Pairing Initiation** | Admin initiates device pairing | `POST /api/v1/auth/pair/initiate` with admin step-up | Single-use 180s TTL pairing token created; QR code displayed. |
| **Scenario C: Sensor Simulation** | Simulated adversary probes decoy network | Sensor packet generator -> `/api/v1/telemetry/ingest` | Probe packet ingested; outbox sequence incremented. |
| **Scenario D: Pipeline Ingestion** | Ingestion pipeline validates telemetry | PostgreSQL Transactional Outbox + Redis pub/sub | Event committed with sequence ID; SCOUT state updated to `MONITORING_INGEST`. |
| **Scenario E: Multi-Vector Detection** | Multi-Vector Engine correlates events | Rule matching against SSH brute-force threshold | High-severity security alert generated; alert ID allocated. |
| **Scenario F: Threat Intelligence** | IoC cross-referenced with STIX feed | `intel.service.enrich_indicator` query | Actor attributed to known adversary campaign; confidence scored. |
| **Scenario G: Alert Generation** | Alert registered in core registry | `alerts.service.evaluate_attack_alert` | Alert created in `NEW` state with risk score and MITRE technique. |
| **Scenario H: Digital Agent Courier** | Event handoff across 4 robotic agents | SCOUT -> NEXUS -> ORACLE -> SENTINEL handoff | Real-time courier movement dispatched; outbox cursor synchronized. |
| **Scenario I: Web Dashboard Update** | Command center updates in real time | Authenticated WebSocket `/ws/events` stream | Web HUD updates KPI cards, cubic Bézier courier advances to SENTINEL. |
| **Scenario J: Mobile Alert Arrival** | Mobile SOC client receives alert | WebSocket / SSE fallback delivery to mobile | Mobile `SocDashboardScreen` increments active alert badge. |
| **Scenario K: Push Notification** | Urgent notification pushed to device | Android notification channel `security-critical` | Push banner displayed with deep-link intent `honeyshield://alert/{id}`. |
| **Scenario L: Mobile Investigation** | Operator opens alert on mobile | `GET /api/v1/alerts/{id}` via mobile REST client | Incident details, IoC confidence, and attack history rendered in HUD. |
| **Scenario M: Historical Replay** | Operator replays past 24h events | Replay engine query `/api/v1/events/replay` | Monotonic event sequence delivered sequentially to mobile client. |
| **Scenario N: Network Disconnection** | Mobile device enters offline state | Simulated network drop (NetInfo disconnected) | UI shifts to amber offline banner; reads cached from Tier-2 SQLite. |
| **Scenario O: Network Recovery** | Mobile connectivity re-established | NetInfo connected -> reconnection handshake | Reconnects with `last_seen_cursor`; drains mutation queue cleanly. |
| **Scenario P: Device Revocation** | Security lead revokes mobile device | `DELETE /api/v1/auth/devices/{id}/revoke` | Device blacklisted in Redis; mobile session severed; keystore wiped. |
| **Scenario Q: Operator Logout** | Operator initiates clean logout | `POST /api/v1/auth/logout` | Refresh token invalidated; client returns to clean login screen. |

All 17 scenarios verified against backend API contracts and mobile integration components.

