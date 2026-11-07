# HoneyShield X — Milestone 21: Operator Acceptance Guide & Verification Runbook

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Operator Acceptance Overview

This runbook guides a security operations lead or quality assurance engineer through a step-by-step interactive verification of HoneyShield X Release Candidate 5 (`v1.0.0-rc5`) using Mozilla Firefox on Parrot OS Linux.

---

## 2. Fifteen-Step Guided Operator Verification Session

### Step 1: Launch the Platform
Execute the one-command launcher in your terminal:
```bash
/home/liza/HoneyShield-X/scripts/launch_universe_demo.sh
```
*Expected Outcome:* Backend boots on port 8000, Vite dev/preview starts on port 5173, and Firefox opens automatically.

### Step 2: Observe Login Gateway & Quick-Select Accounts
Navigate to `http://localhost:5173` if not already open. If presented with the login modal:
- Verify seeded operator accounts are displayed: `Responder Alex`, `Analyst Sarah`, `Admin Chief`.
- Click `Responder Alex` to auto-populate credentials.
- Click `Sign In`.
*Expected Outcome:* Modal closes, authenticated session is established, and `Security Overview` mounts.

### Step 3: Inspect Security Overview & Brand Header
- Check top-left breadcrumbs: `HONEYSHIELD X // Unified Security Operations`.
- Check title: `Security Overview` with badge `SOC LIVE`.
- Check status pill: `3/3 SYSTEMS OPERATIONAL`.
*Expected Outcome:* Header renders cleanly with zero overlapping text.

### Step 4: Toggle the First-Time Platform Guide
- In the top-right header, click the `Platform Guide` button.
- Inspect the 4 guidance cards (Detect, Deceive, Understand, Observe).
- Click `Platform Guide` again or click the close icon (`X`).
*Expected Outcome:* Guide smoothly toggles open and closed; state is persisted across reloads.

### Step 5: Verify the Three Security Pillars
Scroll down to "The Three Security Systems":
- **System 1 (Detection):** Shows active critical alert counts with "View Priority Alerts" button.
- **System 2 (Deception):** Displays "Canary Active (5 Unconfigured)" with "Manage Honeypots" button.
- **System 3 (Threat Intel):** Displays "Indicators, enrichment and correlation" with "Explore Threat Intel" button.
*Expected Outcome:* All 3 pillars present clear technical descriptions and working navigation triggers.

### Step 6: 1-Click Threat Investigation
In the Priority Threat queue:
- Identify the top critical alert (`RCE Exploit Attempt`).
- Click the `Investigate` button on the right edge of the alert row.
*Expected Outcome:* Platform navigates directly to the Forensics workspace with the adversary IP filtered.

### Step 7: Explore Forensics & Process Ancestry
- View the process lineage graph (`bash` &rarr; `python` &rarr; `nc`).
- Inspect MITRE technique tags (`T1059.004`).
*Expected Outcome:* Interactive graph renders nodes with execution context and timestamps.

### Step 8: Verify Containment Safeguard Modal
- Click "Isolate Host".
*Expected Outcome:* Two-step confirmation modal appears requiring explicit confirmation; accidental isolation is blocked. Click "Cancel".

### Step 9: Navigate to Threat Intelligence
- Click `Threat Intelligence` in the left sidebar.
- Enter `198.51.100.99` in the indicator search bar and submit.
*Expected Outcome:* STIX 2.1 indicator card loads showing APT attribution (`APT29 / Cozy Bear`), confidence score, and decay curve.

### Step 10: Test Clean Negative Match
- Enter `10.254.254.254` (benign unlisted IP) in the search bar.
*Expected Outcome:* Clean, non-crashing empty state: *"No active threat intelligence matches for this indicator."*

### Step 11: Enter the Digital Agent Universe
- In the left sidebar, click `Digital Universe` (or click "Explore the Digital Universe" from Overview).
*Expected Outcome:* The Spatial Universe mounts displaying the central Event Singularity core and four robotic quadrants.

### Step 12: Observe Four-Robot Locomotion
Watch the 4 agents in their respective quadrants:
- **SCOUT** (Top-Left): Scanning radar sweeps.
- **NEXUS** (Top-Right): Event streaming telemetry.
- **ORACLE** (Bottom-Right): Threat intelligence fusion.
- **SENTINEL** (Bottom-Left): Containment barrier enforcement.
*Expected Outcome:* Smooth 60 FPS floating locomotion and idling physics with zero hitching.

### Step 13: Watch Real-Time Packet Transfers
- Observe glowing cyan/emerald packets traversing the curved Bézier conduits from the agents toward the Event Singularity.
- Inspect the top telemetry ribbon: `AUTHENTIC LIVE TELEMETRY // REAL-TIME SOC` with live cursor sequence and ingest buffer counts.

### Step 14: Inspect Event Singularity Diagnostics
- Click on the central glowing **Event Singularity Core** (or press key `C`).
*Expected Outcome:* The Holographic Diagnostics Modal opens displaying detailed outbox buffer status, stream health, and Merkle hash verification. Click Close.

### Step 15: Safe Session Termination & Logout
- Click on the user profile icon in the top header.
- Click `Sign Out`.
*Expected Outcome:* Session token is cleared from memory and storage; UI transitions back to the unauthorized gateway.

