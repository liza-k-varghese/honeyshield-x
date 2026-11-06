# Milestone 14 — Operator User Acceptance Testing (UAT) Procedures

**Document ID:** `HSX-DOC-M14-029`  
**Classification:** User Acceptance Testing & Human Validation  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Operator UAT Verification Protocol

This runbook guides a human SOC operator through verifying HoneyShield X in a local Firefox or Chrome browser:

### Step 1: Web SOC Access & Authentication
1. Open Firefox and navigate to `http://localhost:5173`.
2. Authenticate using Analyst credentials.
3. Verify Analyst role badge appears in the top-right header with zero console errors.

### Step 2: Live Digital Agent Universe Observation
1. Navigate to the Digital Agent Universe tab.
2. Observe all 4 robotic characters in their resting ambient hover breathing states:
   - SCOUT (`#3B82F6` Electric Blue)
   - NEXUS (`#06B6D4` Cyan)
   - ORACLE (`#A855F7` Purple)
   - SENTINEL (`#EF4444` Red)

### Step 3: Attack Simulation & Kinetic Event Verification
1. Run the event verification script: `backend/.venv/bin/python scripts/verify_cross_platform_event_trace.py`.
2. Observe the kinetic progression:
   - SCOUT moves along Bézier trajectory to collect sensor telemetry.
   - NEXUS normalizes schema and commits outbox event.
   - ORACLE pulses violet with APT-29 threat attribution banner.
   - SENTINEL pulses signal red and registers Alert #1 in the Incident Feed.

### Step 4: Packet Inspection & Historical Replay
1. Click on the moving packet between NEXUS and ORACLE.
2. Verify the Packet Inspector modal displays `event_id`, `correlation_id`, `severity`, and `risk_score: 94.0`.
3. Open Historical Replay, drag the timeline slider, and confirm smooth scrub forward and backward.

### Step 5: Incident Triage & Dry-Run Containment
1. In the Incident Feed, click on Alert #1.
2. Review the automated playbook suggestion (`PB-01: BRUTE-FORCE`).
3. Click "Acknowledge Incident" and verify status updates to `acknowledged`.

### Step 6: Session Revocation & Logout
1. In Settings, click "Logout".
2. Confirm active WebSocket disconnects and the browser immediately redirects to `/login`.

