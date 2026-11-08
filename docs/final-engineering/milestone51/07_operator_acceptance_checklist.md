# Milestone 51 — Deliverable 07: Simple Operator Acceptance Checklist & Firefox Walkthrough

**Release Candidate:** `v1.0.0-rc5`  
**Host Application:** `http://127.0.0.1:5173/`  
**Auditor:** Human Release Operator  

---

## Simple Step-by-Step Firefox Walkthrough
*(No advanced terminal knowledge required)*

### Step 1: Open HoneyShield X in Firefox
1. On your desktop, open **Mozilla Firefox**.
2. In the address bar, navigate to:
   ```
   http://127.0.0.1:5173/
   ```
3. **What you should see:** A clean, dark-themed sign-in card centered on the screen.
4. Log in using your operator credentials.

### Step 2: Verify the Minimal Security Overview
1. Upon login, the **Security Overview** dashboard appears immediately.
2. Verify the following:
   - [ ] Top banner displays a green pulse and states: **`3 / 3 Core Systems Operational`**.
   - [ ] 4 KPI cards are visible (Active Incidents, Total Events Ingested, MTTR, Active Honeypots).
   - [ ] The **Priority Alerts** queue displays high/critical threat cards with action buttons (`Investigate`, `Acknowledge`, `Suppress`).

### Step 3: Launch the Digital Agent Universe
1. In the header bar or overview strip, click the prominent blue button:
   **`LAUNCH DIGITAL AGENT UNIVERSE ->`**
   *(Or navigate directly to: `http://127.0.0.1:5173/?view=universe`)*
2. Verify the spatial observatory:
   - [ ] The central **Event Singularity** core is pulsing with concentric orbital rings.
   - [ ] All four robotic agents are docked in their designated quadrants:
     - **SCOUT** (Top-Left): Blue (`#3B82F6`)
     - **NEXUS** (Top-Right): Cyan (`#00E5FF`)
     - **ORACLE** (Bottom-Right): Purple (`#A855F7`)
     - **SENTINEL** (Bottom-Left): Red (`#EF4444`)

### Step 4: Witness the Four-Robot Whole-Body Relay
1. Look at the lower **Universe Controls** strip.
2. Press the **Spacebar** on your keyboard (or click **`START / RESUME RELAY`**).
3. Watch the continuous flight animation carefully:
   - [ ] **SCOUT** physically lifts off from its docking pad.
   - [ ] The Scout docking pad status badge changes to **`DEPLOYED / IN TRANSIT`** (confirm that no duplicate robot remains sitting on the dock).
   - [ ] A **glowing blue payload packet** is attached beneath SCOUT's chassis.
   - [ ] SCOUT physically flies across the universe along a smooth curved path, tilting/banking naturally into the turn.
   - [ ] SCOUT arrives at the NEXUS dock and hands off the payload.
   - [ ] **NEXUS** lifts off carrying the cyan packet and flies to the ORACLE dock.
   - [ ] **ORACLE** lifts off carrying the purple packet and flies to the SENTINEL dock.
   - [ ] **SENTINEL** lifts off carrying the red packet and returns to origin to complete the relay.

### Step 5: Test Pause, Resume & Speed Controls
1. While an agent is in mid-air, press **Spacebar** to pause.
   - [ ] Confirm the robot halts smoothly in mid-flight and the dock badge shows **`DEPLOYED / PAUSED`**.
2. Press **Spacebar** again to resume.
   - [ ] Confirm the robot resumes its trajectory without jumping or resetting.
3. Click the speed buttons (`0.5x`, `1.0x`, `2.0x`) to confirm speed modulation.

### Step 6: Return to Overview & Logout
1. In the top-left header of the Universe, click:
   **`<- RETURN TO OVERVIEW`**
   - [ ] Confirm the view smoothly returns to the minimal Security Overview.
2. Click the operator avatar/logout button in the top-right corner.
   - [ ] Confirm you are returned to the sign-in screen and the session is cleared.

---

## Operator Sign-Off Section

| Verification Item | Operator Confirmation | Notes |
| :--- | :--- | :--- |
| **1. Login & Security Overview** | [ ] Confirmed | Minimal, fast, responsive |
| **2. Four Robots Rendered** | [ ] Confirmed | Blue, Cyan, Purple, Red |
| **3. Continuous Flight Locomotion** | [ ] Confirmed | Smooth Bézier flight path |
| **4. Packet Attachment in Flight** | [ ] Confirmed | Glowing packet remains attached |
| **5. Dock Departure State** | [ ] Confirmed | No duplicate robot on dock |
| **6. Pause / Resume Control** | [ ] Confirmed | Halts and resumes in mid-air |
| **7. Return to Overview & Logout** | [ ] Confirmed | Clean escape navigation |

### Formal Release Authorization

- [ ] **I have personally witnessed the above live user journey in Mozilla Firefox and approve HoneyShield X `v1.0.0-rc5` for production release.**

**Operator Name:** `________________________________________`  
**Operator Title:** `________________________________________`  
**Signature:** `____________________________________________`  
**Date:** `____________________`  
*(Leave blank until physically verified in Firefox)*
