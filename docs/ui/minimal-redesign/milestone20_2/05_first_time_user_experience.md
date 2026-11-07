# HONEYSHIELD X — MILESTONE 20.2 FTUX REPORT
## 05: FIRST-TIME USER EXPERIENCE, ONBOARDING GUIDE & ZERO-FAKE-DATA GUARANTEE

**Document Version:** 1.0.0-rc5  
**Audit Date:** 2026-11-07  
**Subsystem:** First-Time User Experience (FTUX) Framework  

---

### 1. Lightweight, Dismissible Onboarding Guide

To provide immediate clarity without forcing operators through blocking walkthrough modals, Milestone 20.2 introduces an integrated, dismissible FTUX onboarding guide on `SecurityOverview.tsx`.

#### The 4 Capability Pillars Communicated:
1. **Detect — Security Operations:**
   - *"Detect and investigate suspicious activity across your network and endpoints."*
   - Direct Action: `View Alerts →`
2. **Deceive — Deception & Honeypots:**
   - *"Observe attackers interacting with controlled traps and canary tokens."*
   - Direct Action: `Manage Traps →`
3. **Understand — Threat Intelligence:**
   - *"Connect indicators and enrich security investigations with global STIX feeds."*
   - Direct Action: `Explore Intel →`
4. **Coordinate — Digital Agent Universe:**
   - *"Visualize how events move through HoneyShield X using four robotic agents."*
   - Direct Action: `Open Universe →`

---

### 2. Operator Control & Persistence

- **One-Click Dismissal:** Clicking `Dismiss Guide` (or the `✕` close trigger) closes the card.
- **Local Persistence:** Dismissal state is saved to `localStorage` under key `hsx_guide_open`, preventing repeat intrusion for experienced operators.
- **Reopen Anytime:** A dedicated `Platform Guide` button with a compass icon is permanently accessible in the top-right introduction bar, allowing operators to reopen the guide on demand.

---

### 3. The Zero-Fake-Data Integrity Guarantee

A foundational principle of HoneyShield X UX is that new accounts or empty staging environments are never populated with fabricated attacks, fake incident counts, or artificial telemetry merely to look "busy."
- If no attacks have occurred: The activity feed renders a clean, reassuring empty state: *"No security activity recorded yet. Monitored telemetry will appear here in real-time."*
- If no critical alerts are open: The alert queue renders: *"All systems nominal — No open high-priority alerts requiring immediate operator triage. No critical alerts in the selected period."*
- If external daemons are not running: The sensor health card displays: *"Canary Active (5 Unconfigured) • Daemons unconfigured in staging"*.

