# Milestone 12 — Mobile SOC Command Center Dashboard

**Document:** `milestone12_soc_dashboard.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Screen Architecture

The Mobile SOC Dashboard (`SocDashboardScreen.tsx`) serves as the central operational hub for mobile incident responders:
- **Header HUD:** Displays platform identity (`HONEYSHIELD X`), active release tag (`v1.0.0-rc5`), and real-time connectivity status.
- **Digital Agent Universe HUD (`DigitalAgentStatusPanel.tsx`):**
  - Displays the 4 digital agents: SCOUT (Blue `#3B82F6`), NEXUS (Cyan `#06B6D4`), ORACLE (Purple `#A855F7`), SENTINEL (Red `#EF4444`).
  - Monotonic Outbox Sequence Cursor.
  - Active Courier Handoff Traces.
- **KPI Summary Grid:**
  - `TOTAL ATTACKS`: Real count ingested from `/api/v1/attacks/recent`.
  - `ACTIVE ALERTS`: Unresolved alerts count from `/api/v1/alerts`.
- **Recent Attack Telemetry Feed:** Real-time attack events stream with MITRE ATT&CK technique tags.

## 2. Elimination of Mock Fallbacks

Prior implementations used static placeholder counters (`1,248` attacks, `5,824` events).
Under Milestone 12:
- Loading states display animated skeleton loaders.
- Real API values are mapped directly to state.
- Empty states display informative HUD panels.
- API connectivity errors trigger prominent error banners with one-click "RETRY CONNECTIVITY" actions.

