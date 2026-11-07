# HONEYSHIELD X — MILESTONE 20
## 04: SECURITY OVERVIEW DASHBOARD SPECIFICATION

**Document:** `docs/ui/minimal-redesign/04_overview_dashboard.md`  
**Classification:** Core Component Specification (`SecurityOverview.tsx`)  
**Author:** Principal Full-Stack Engineering Lead  
**Status:** Approved & Implemented  

---

### 1. Component Purpose & Overview

`frontend/src/components/SecurityOverview.tsx` is the centerpiece of the Milestone 20 redesign. It acts as the calm, minimal commercial SaaS dashboard that greets every operator, replacing the previous default canvas.

It is structured into six logical, high-signal sections:
- **Section A:** Page Introduction & Live SOC Operational Status
- **Section B:** 4 Essential Security Metric Tiles
- **Section C:** Priority Alerts Table (Direct Triage)
- **Section D:** Live Activity Feed (Filtered Telemetry)
- **Section E:** The Three Primary Security Systems (Architecture Clarity)
- **Section F:** Digital Agent Universe Entry Banner (Gateway to Universe 2.0)

---

### 2. Detailed Section Specifications

#### Section A: Page Introduction & Live SOC Operational Status
- **Title:** "Security Overview" (`text-2xl font-bold font-sans text-white`)
- **Subtitle:** "Your unified security operations at a glance." (`text-sm text-slate-400`)
- **SOC Live Pill:** Glowing cyan badge indicating active WebSocket telemetry.
- **Service Health Pill:** Dynamic indicator evaluating `stats.system_health` (API, PostgreSQL, Redis) displaying `3/3 SYSTEMS OPERATIONAL` with pulsing emerald dot.
- **Top Universe Shortcut:** Discreet button for direct universe launch.

#### Section B: 4 Essential Security Metric Cards
Each card occupies a 1-column slot in a 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`):
1. **Critical Alerts:**
   - Primary metric: Count of open `critical` and `high` alerts requiring triage.
   - Styling: Red accent when > 0 (`text-red-400`); neutral when 0.
   - Subtext: Total open alerts in the queue.
2. **Monitored Threats:**
   - Primary metric: Total attack events detected across the deployment.
   - Styling: Bold white typography with amber activity icon.
   - Subtext: Unique attacker IPs identified within 24h.
3. **Deception Sensors:**
   - Primary metric: `4 / 4 active traps` (SSH, HTTP, SQL, Redis).
   - Styling: Emerald accent highlighting perimeter containment health.
   - Subtext: Active listener protocols.
4. **Events Processed (24h):**
   - Primary metric: Total telemetry events ingested and verified.
   - Styling: Cyan accent bound directly to WebSocket client metrics or backend totals.
   - Subtext: WebSocket connection health state (`CONNECTED`).

#### Section C: Priority Alerts Table
- Occupies a 2/3 width column in the desktop layout.
- Prioritizes top 5 unhandled critical/high alerts sorted by severity and open status.
- Columns: `Severity`, `Alert Title / Message`, `Source IP`, `Time`, `Status`, `Action`.
- Single-click action: `Investigate` button triggers deep forensic inspection for the source IP.
- Empty state: Displays "All systems nominal" with green checkmark when zero high-priority alerts are open.

#### Section D: Live Activity Feed
- Occupies the 1/3 width companion column.
- Displays the 8 most recent attacks or honeypot engagement events.
- Filter controls: Toggle between `All` events and `Critical` only.
- Information per item: Attacker IP, detected attack type, severity pill, and relative timestamp.

#### Section E: The Three Primary Security Systems
Three elegant cards clearly explaining the platform's architectural triad:
1. **System 1: Security Operations**
   - Tag: `SYSTEM 1` (Blue badge)
   - Status: `ACTIVE` with active alerts counter.
   - Role: Autonomous threat detection, real-time alert triage, and incident containment.
   - Action: `View Alerts →` (routes to `/alerts`).
2. **System 2: Deception & Honeypots**
   - Tag: `SYSTEM 2` (Emerald badge)
   - Status: `4 LISTENERS` (Cowrie, Dionaea grid).
   - Role: Active decoy networks and canary traps engaging attackers before production access.
   - Action: `Manage Honeypots →` (routes to `/deception`).
3. **System 3: Threat Intelligence**
   - Tag: `SYSTEM 3` (Purple badge)
   - Status: `STIX/TAXII` verified.
   - Role: Adversary campaign attribution, indicator enrichment, and multi-feed IOC correlation.
   - Action: `Explore Threat Intel →` (routes to `/intel`).

#### Section F: Digital Agent Universe Entry Banner
- A premium, restrained gradient banner (`from-slate-900 via-slate-900/90 to-cyan-950/40`) with cyan border.
- Title: `Explore the Digital Agent Universe` with `UNIVERSE 2.0` badge.
- Description: Explains the spatial cyber observatory where autonomous robotic agents transport verified telemetry across Bézier conduits with real-time outbox tracking.
- Character badges: Features authentic color-coded badges for all 4 agents:
  - **SCOUT** (`bg-blue-500` - Honeypot Sentinel)
  - **NEXUS** (`bg-cyan-400` - Central Neural Outbox Hub)
  - **ORACLE** (`bg-purple-500` - Threat Intelligence Correlator)
  - **SENTINEL** (`bg-red-500` - Incident Response Automator)
- Action: High-visibility `OPEN UNIVERSE` button routing directly to `UniverseCommandCenter.tsx`.

---

### 3. Verification & Test Coverage

- Tested via `frontend/src/tests/security_overview.test.tsx` (7 passing tests).
- Verified zero layout shift under responsive viewports (360px mobile to 2560px ultra-wide).
- Verified full accessibility compliance (WCAG 2.2 AA).

