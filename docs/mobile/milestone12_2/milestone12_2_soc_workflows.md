# Milestone 12.2 — Mobile SOC Workflows & Incident Management

**Document:** `milestone12_2_soc_workflows.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. SOC Dashboard & Telemetry Integrity

`SocDashboardScreen.tsx` provides the primary field monitoring display:
- **Eradication of Synthetic Data:** All mock counts and static attacks were permanently removed in Milestone 12.
- **KPI Summary Grid:** Real attack counts from `/api/v1/attacks/recent` and unresolved alert tallies from `/api/v1/alerts`.
- **Digital Agent Status Panel:** Renders the 4 digital agents (SCOUT, NEXUS, ORACLE, SENTINEL) and monotonic outbox sequence cursors.
- **State Machine Compliance:** Implements `LOADING`, `LOADED`, `EMPTY`, and `ERROR` states with retry actions.

---

## 2. Attack Investigation & Alert Triage

- **Alerts Inbox (`AlertsListScreen.tsx`):** Severity filtering (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`), one-touch alert acknowledgment, and escalation to incident cases.
- **Attack Explorer (`AttackExplorerScreen.tsx`):** Detailed probe inspection, raw keystroke playback, attacker source IP, and MITRE ATT&CK technique mapping.
- **Incident Cases (`CasesListScreen.tsx`):** Interactive SOAR playbooks with checklist tasks and Governor Level-3 quarantine execution triggers.

