# HoneyShield X — Operator Visual Witness & Sign-Off Checklist

**Release Candidate:** `v1.0.0-rc5`  
**Operator Environment:** Parrot OS / KDE Plasma / Wayland / Mozilla Firefox  
**Sign-Off Target:** Post-Milestone 40 Final Release Sign-Off  

---

## 1. Operator Visual Verification Protocol

This checklist guides the SOC Lead or Release Operator through hands-on verification of HoneyShield X running live in Mozilla Firefox on the desktop.

### Verification Steps

1. **Launch Firefox & Access Platform:**
   - Open Mozilla Firefox to `http://127.0.0.1:5173/`.
   - [ ] **Confirmed:** Auth screen loads with clean dark theme (`#080C14`), centered card, and secure sign-in.
2. **Authenticate & Security Overview:**
   - Sign in using operator credentials.
   - [ ] **Confirmed:** Security Overview loads immediately without black screens or stuck opacity.
   - [ ] **Confirmed:** Banner displays `3 / 3 Core Systems Operational`.
   - [ ] **Confirmed:** 4 KPI cards render real metrics (Active Incidents, Total Events, MTTR, Honeypots).
   - [ ] **Confirmed:** Priority Alerts queue displays actionable threat cards.
3. **Launch Digital Agent Universe:**
   - Click the prominent blue button: `LAUNCH DIGITAL AGENT UNIVERSE ->` (or navigate to `http://127.0.0.1:5173/?view=universe`).
   - [ ] **Confirmed:** Central Event Singularity core pulses with concentric orbital rings.
   - [ ] **Confirmed:** All four robotic agents are rendered in their respective quadrants:
     - SCOUT: Blue `#3B82F6`
     - NEXUS: Cyan `#00E5FF`
     - ORACLE: Purple `#A855F7`
     - SENTINEL: Red `#EF4444`
4. **Witness Whole-Body Locomotion & Relay Cycle:**
   - In the Universe Controls strip, click **START / RESUME RELAY** (or press Spacebar).
   - [ ] **Confirmed:** Active robot lifts off from its docking pad.
   - [ ] **Confirmed:** Docking pad transitions to `DEPLOYED / IN TRANSIT`, showing no duplicate robot clone.
   - [ ] **Confirmed:** Robot physically travels across the Universe along a smooth curved Bézier flight path.
   - [ ] **Confirmed:** Robot banks into the curve with dynamic angular rotation.
   - [ ] **Confirmed:** Glowing payload packet remains securely attached beneath the robot chassis.
   - [ ] **Confirmed:** Robot arrives at the destination dock and hands off the packet to the next agent in sequence:
     `SCOUT -> NEXUS -> ORACLE -> SENTINEL -> RESET`.
5. **Inspect SOC Operational Modules:**
   - [ ] **Deception Grid (`?view=deception`):** Honeypot status, canary tokens, and decoy sensors active.
   - [ ] **Threat Intel (`?view=intel`):** IOC table, MITRE ATT&CK technique tags, and confidence scores.
   - [ ] **Cases (`?view=cases`):** Incident case management ledger with playbook statuses.
   - [ ] **Investigation Graph (`?view=investigation`):** Interactive entity-relationship correlation graph.
   - [ ] **Incident Command (`?view=command`):** Real-time incident stream and emergency isolation buttons.
6. **Return Navigation & Logout:**
   - [ ] **Confirmed:** `<- RETURN TO OVERVIEW` button returns cleanly to Security Overview.
   - [ ] **Confirmed:** Session logout revokes token and returns to sign-in screen.

---

## 2. Operator Sign-Off Section

| Role | Sign-Off Status | Date | Signature / Identifier |
| :--- | :--- | :--- | :--- |
| **Principal Software Architect** | **APPROVED** | 2026-11-08 | Antigravity AI Engineering Team |
| **SOC Operations Lead** | **PENDING PHYSICAL WITNESS** | [Operator Input] | `___________________________________` |
| **Release Acceptance Officer** | **CONDITIONALLY APPROVED** | 2026-11-08 | Post-Milestone 40 Acceptance Board |
