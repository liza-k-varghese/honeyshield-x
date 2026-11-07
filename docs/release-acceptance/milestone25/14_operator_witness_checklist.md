# HoneyShield X — Milestone 25: Interactive Operator Witness Checklist

**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Mozilla Firefox  
**Milestone:** 25 — Final Operator Witness & Release Sign-Off  
**Auditor:** Independent Release Acceptance & Quality Assurance Auditor  
**Date:** 2026-11-07  

---

## 1. Operator Witness Instructions

This checklist is the definitive instrument for the human operator to physically witness and certify HoneyShield X `v1.0.0-rc5` in native Mozilla Firefox on Parrot OS Linux (KDE Plasma on Wayland).

Each step represents a critical user workflow. Please execute each step sequentially, observe the physical screen display, and mark `[X]` upon successful verification.

---

## 2. 15-Step Interactive Verification Runbook

### Phase A: Environment Startup & Initial Access
- [ ] **Step 01: Platform Daemons Initialization**  
  Execute `./scripts/launch_universe_demo.sh` from the repository root.  
  *Expected Result:* Backend runs on `http://127.0.0.1:8000`, frontend runs on `http://127.0.0.1:5173`. Zero crash errors in terminal.

- [ ] **Step 02: Firefox Launch & Minimal UI Impression**  
  Open Firefox and navigate to `http://127.0.0.1:5173`.  
  *Expected Result:* Dark-themed minimalist SOC console loads instantly. Header displays `"HoneyShield-X SOC Console"` with brand tagline `"Detect. Deceive. Defend."`. Zero layout shifting or FOUC.

- [ ] **Step 03: Persona Authentication & Session Verification**  
  On the Login Modal, click the **Responder Alex** quick persona card. Click **Sign In**.  
  *Expected Result:* Form authenticates against `/api/v1/auth/login`. Header displays operator badge `alex (Responder)`. Browser DevTools (`F12` $\rightarrow$ Storage) confirms JWT in `sessionStorage`.

---

### Phase B: SOC Operational Workflows (The 3 Major Systems)
- [ ] **Step 04: Security Posture & KPI Assessment**  
  Inspect the **Security Overview** dashboard.  
  *Expected Result:* Posture dial displays clear numerical rating ($84/100$ or live computed score). Four KPI cards clearly display Total Events, Active Alerts, Canary Traps, and MTTR.

- [ ] **Step 05: Critical Alert Inspection & Triage**  
  Navigate to **Threats & Alerts**. Locate the Critical alert (e.g., `RCE Exploit Attempt`). Click to view details.  
  *Expected Result:* Incident drawer or modal displays complete threat provenance: Source IP `198.51.100.99`, MITRE technique T1059, risk score $96.0$.

- [ ] **Step 06: Incident Investigation & Mitigation Staging**  
  Navigate to **Investigations**. Open active case `#1` and click **Stage Containment**.  
  *Expected Result:* Confirmation dialog displays containment action (IP Quarantine via SENTINEL). Action commits and creates a recorded audit log entry.

- [ ] **Step 07: Honeypot & Deception Inspection (System 2)**  
  Navigate to **Honeypots & Deception**.  
  *Expected Result:* Traps list displays active sensors. Status badge truthfully reflects `Canary Active (5 Unconfigured)`. SQL Canary and SSH Trap show armed status.

- [ ] **Step 08: Threat Intelligence Exploration (System 3)**  
  Navigate to **Threat Intelligence**.  
  *Expected Result:* Threat feeds and IOC graph render smoothly. AlienVault OTX correlation cards display reputation telemetry with zero network timeouts.

---

### Phase C: Digital Agent Universe & Robotic Motion Acceptance
- [ ] **Step 09: Digital Agent Universe Navigation & Silhouette Verification**  
  Click the **Digital Universe** navigation tab.  
  *Expected Result:* Space canvas opens. All 4 robotic agents are visually present at designated base stations:
  - **SCOUT** (Cyan radar dish, reconnaissance hovercraft)
  - **NEXUS** (Amber rotating multi-faceted core, central dispatch hub)
  - **ORACLE** (Violet orbital knowledge rings, forensic observatory)
  - **SENTINEL** (Crimson reinforced blast armor, defensive fortress)

- [ ] **Step 10: SCOUT Detection & Physical Locomotion**  
  Click **Start Demo Relay**.  
  *Expected Result:* SCOUT detects an incoming SYN/RCE packet. Glowing cyan payload attaches to SCOUT. SCOUT smoothly traverses along a cubic Bézier trajectory toward NEXUS.

- [ ] **Step 11: NEXUS Docking & Payload Transfer**  
  Observe the SCOUT $\rightarrow$ NEXUS approach.  
  *Expected Result:* SCOUT docks within 45px. Glowing payload transfers smoothly without floating or detaching. NEXUS core pulses amber as it enriches the event metadata.

- [ ] **Step 12: ORACLE Threat Reasoning Traversal**  
  Observe the NEXUS $\rightarrow$ ORACLE handoff.  
  *Expected Result:* NEXUS travels to ORACLE. ORACLE orbital rings spin in violet. Payload expands into an evaluated threat dossier and containment directive.

- [ ] **Step 13: SENTINEL Active Containment & Shield Lock**  
  Observe the ORACLE $\rightarrow$ SENTINEL emergency dispatch.  
  *Expected Result:* ORACLE delivers containment ticket to SENTINEL. SENTINEL locks armor into fortress mode. Crimson shield pulses. Mitigation receipt is emitted.

- [ ] **Step 14: Universe Control Functions (Pause / Resume / Reset)**  
  During relay playback, click **Pause**, then **Resume**, then **Reset**.  
  *Expected Result:* **Pause** immediately freezes robots in place without coordinate jump. **Resume** continues smoothly. **Reset** returns all 4 robots to base coordinates.

---

### Phase D: Console Hygiene & Full Return
- [ ] **Step 15: Return to Main Dashboard & DevTools Console Inspection**  
  Click **Security Overview** in the primary navigation. Open Firefox Web Console (`Ctrl+Shift+K`).  
  *Expected Result:* UI returns instantly to the main dashboard. Console shows **ZERO unhandled exceptions, ZERO React key warnings, and ZERO 404/500 network errors**.

---

## 3. Formal Operator Witness Certification & Sign-Off

Upon completing the 15 verification steps above, the authorized operator completes this sign-off block:

```
+--------------------------------------------------------------------------------------------------+
|                            HONEYSHIELD X RC5 RELEASE SIGN-OFF BLOCK                              |
+--------------------------------------------------------------------------------------------------+
| Release Candidate Version:   v1.0.0-rc5                                                         |
| Host Environment:            Parrot OS Linux / KDE Plasma / Wayland / Mozilla Firefox            |
| Evaluation Date:             ________________________________________                           |
| Operator Name / Call Sign:   ________________________________________                           |
| Operator Title / Role:       ________________________________________                           |
+--------------------------------------------------------------------------------------------------+
| Physical Verification Status:                                                                    |
| [  ] ALL 15 VERIFICATION STEPS WITNESSED AND SATISFIED                                           |
| [  ] DEFICIENCIES NOTED (ATTACH DETAILS BELOW)                                                   |
+--------------------------------------------------------------------------------------------------+
| Formal Release Disposition:                                                                      |
| [  ] APPROVED FOR RC5 PRODUCTION RELEASE (Gate R -> FULL PASS)                                   |
| [  ] CONDITIONALLY READY (Pending final operational authorization)                              |
| [  ] REJECTED FOR RELEASE                                                                        |
+--------------------------------------------------------------------------------------------------+
| Operator Signature:          ________________________________________                           |
+--------------------------------------------------------------------------------------------------+
```

