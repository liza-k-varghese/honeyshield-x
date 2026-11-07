# HONEYSHIELD X — POST-MILESTONE 20.3 ACCEPTANCE PACKAGE
## 07: DASHBOARD METRIC ACCURACY & SERVICE HEALTH TRUTHFULNESS

**Release Candidate:** `v1.0.0-rc5`  
**Audit Date:** 2026-11-07  
**Platform Scope:** Metric Definitions, Telemetry Persistence & Service Health (Milestone 20.5)  
**Host Environment:** Parrot OS Linux, KDE Plasma, Wayland Compositor, Firefox  
**Lead Auditor:** Principal Data Integrity Specialist & SRE Lead  

---

### 1. Executive Summary

In security operations, metric accuracy is an operational necessity. Presenting stale, estimated, or fabricated numbers degrades operator trust and can cause incident commanders to misallocate response resources during an active breach.

This document records the mathematical definitions, backend query mechanisms, and verification outcomes for every metric, service health badge, and operational state on the HoneyShield X dashboard.

---

### 2. Authoritative Metric Definitions & Resolution Mechanisms

| Metric Label | Authoritative Definition | Backend Query Source | Fallback Behavior |
|---|---|---|---|
| **Critical Alerts** | Count of unresolved (`status = 'open'`) alerts with `severity = 'critical'`. | `SELECT COUNT(*) FROM alerts WHERE status = 'open' AND severity = 'critical'` | Displays `0 Active` when no critical alerts exist. |
| **Active Threats** | Unique external attacker IP addresses observed within the sliding 24-hour UTC window. | `SELECT COUNT(DISTINCT source_ip) FROM attacks WHERE detected_at >= NOW() - INTERVAL '24 HOURS'` | Displays `0 Active` when perimeter is idle. |
| **Sensor Health** | Count and deployment status of armed honeypots and canary tokens. | Queries `/api/v1/health` honeypot subsystem status. | Reports `Canary Active (5 Unconfigured)` in staging. |
| **Events Processed** | Total security events persisted across the rolling 24-hour UTC window. | `SELECT COUNT(*) FROM attack_events WHERE timestamp >= NOW() - INTERVAL '24 HOURS'` | Displays `Events Received (Session)` when stream-only. |

---

### 3. Telemetry Aggregation: Persistent DB vs. Session Stream

A major defect discovered in earlier prototypes was using the frontend WebSocket counter as the "24h Events Processed" metric. A user opening the dashboard would see "0 Events (24h)", and after 30 seconds see "12 Events (24h)", creating the false impression that only 12 events occurred in the past day.

HoneyShield X resolves this via deterministic dual-mode telemetry:
- **Mode 1 (Database Persistent Aggregate):** When the backend is online, the frontend queries `/api/v1/dashboard/stats`, returning the authoritative 24-hour persistent count (e.g., `2,847 Events (24h)`).
- **Mode 2 (Honest Stream Fallback):** When persistent statistics are temporarily unreachable or during disconnected demonstrations, the UI explicitly labels the metric as:
  `"42 Events Received (Session)"`
  preventing any misinterpretation of ephemeral counts as historical totals.

---

### 4. Infrastructure Services vs. Functional Systems

To eliminate ambiguity between server uptime and organization security:
1. **Infrastructure Health (`Infrastructure: 3/3 Services Online`):**
   - Displayed strictly in the top header.
   - Monitors: (1) PostgreSQL Database, (2) Redis Cache/PubSub, (3) FastAPI Backend Server.
2. **Functional Security Systems:**
   - Displayed in the central dashboard canvas.
   - Represents the operational state of System 1 (SecOps), System 2 (Deception), and System 3 (Intel).

---

### 5. Operator Identity Derivation

Operator name, email, and role are dynamically decoded from the authenticated JWT session claims in [`AuthContext.tsx`](file:///home/liza/HoneyShield-X/frontend/src/context/AuthContext.tsx):
- Role `security_administrator` displays: `"Chief Admin (Admin)"`
- Role `analyst` displays: `"Sarah Analyst (Analyst)"`
- Session expiration immediately transitions the UI to the unauthorized state and opens `LoginModal.tsx`.

---

### 6. Honest Operational States Matrix

| State | UI Presentation | Behavior |
|---|---|---|
| **LOADING** | Skeletal shimmer on metric cards; spinner on tables | Non-blocking, preserves existing layout bounds |
| **READY** | Full high-contrast typography and real-time updates | Active WebSocket event subscription |
| **EMPTY** | Calm slate badge: *"Perimeter secure — zero active critical alerts"* | Reassuring guidance without layout collapse |
| **DEGRADED** | Amber status pill: *"Canary Active (5 Unconfigured)"* | Explicit warning of unconfigured perimeter decoys |
| **UNAVAILABLE**| Slate badge: *"Telemetry Unavailable — [Retry]"* | Avoids displaying fake zero |
| **UNAUTHORIZED**| Modal dialog: *"Session Expired — Please Authenticate"* | Clears cached tokens; prompts login |
| **DISCONNECTED**| Amber pill: *"WebSocket Reconnecting (Attempt 2/5)..."* | Exponential backoff reconnect loop |
| **ERROR** | Red alert banner with explicit error text and retry CTA | Actionable remediation trigger |

