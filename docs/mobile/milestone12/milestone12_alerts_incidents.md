# Milestone 12 — Mobile Alerts & Incident Management

**Document:** `milestone12_alerts_incidents.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Alert Triage Workflow

Mobile operators triage alerts using `AlertsListScreen.tsx` and `AttackExplorerScreen.tsx`:
- **Severity Classification:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `INFO` badges with distinct glowing colorways.
- **Filter Bar:** One-touch severity filters (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`).
- **Interactive Actions:**
  - `Acknowledge Alert`: Updates state to `INVESTIGATING`.
  - `Escalate to Case`: Promotes alert to SOAR Incident Case.
  - `Quarantine Host`: Launches Governor Modal for Level-3 containment.
  - `Dismiss False Positive`: Closes alert with audit reason.

## 2. Empty & Error States

- If zero alerts exist for the selected filter, the UI renders `NO ALERTS FOR SELECTION` with a calm green optimal border.
- In the event of backend network errors, the screen presents an error panel with retry capabilities, preventing deceptive or stale display states.

