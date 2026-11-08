# HoneyShield X — Milestone 52 Engineering Deliverable
## 07: Human Operator Interactive Verification Runbook

**Document Version:** 1.0.0  
**Target User:** Human Security Operator / QA Acceptance Lead  
**Application URL:** `http://127.0.0.1:5173`  
**Browser:** Mozilla Firefox (on Parrot OS / KDE Plasma / Wayland)  
**Date:** 2026-11-08  

---

## 1. Objective

Provide the human operator with a clear, step-by-step checklist to personally verify:
1. All four robots move in sequential succession (**SCOUT $\to$ NEXUS $\to$ ORACLE $\to$ SENTINEL**).
2. Stationary robots display explicit `STANDBY [LEG X/4]` indicators.
3. The Developer Diagnostics HUD can be toggled via button or key `H`.
4. Glowing packets remain attached during transit and detach cleanly at delivery.
5. VCR controls (Play, Pause, Step Forward, Reset, Speed) function as expected.

---

## 2. Step-by-Step Operator Verification Procedure

### Step 1: Open HoneyShield X in Firefox
1. Launch Mozilla Firefox.
2. Navigate to `http://127.0.0.1:5173`.
3. If not already authenticated, click **SIGN IN** (or log in with `admin@honeyshield.internal` / `HoneyShield2026!`).
4. In the top navigation bar, click **UNIVERSE** (or append `?view=universe` to the address bar).

### Step 2: Inspect Initial Universe State
1. Verify the central **Event Singularity Core** displays `CONNECTED` and shows total events.
2. Verify all four quadrants render their distinct robotic agents:
   - Top-Left: **SCOUT** (Sensor Frontier — Blue Radar character)
   - Top-Right: **NEXUS** (Processing Nexus — Cyan Hover character)
   - Bottom-Right: **ORACLE** (Intelligence Sanctum — Purple Geometric character)
   - Bottom-Left: **SENTINEL** (Response Bastion — Red Shield character)
3. Check the bottom control bar:
   - Button says: `RUN LOCOMOTION`
   - CARRIER reads: `SCOUT`
   - PHASE reads: `READY`
   - Progress reads: `0%`

### Step 3: Open Developer Diagnostics HUD
1. Press the `H` key on your keyboard, or click the **DEV HUD** button in the bottom control strip.
2. Verify a translucent dark panel appears in the upper-left corner labeled **RELAY DIAGNOSTICS HUD**.
3. Confirm it lists all 11 fields:
   - `Current Relay Stage`: Stage 1/4: Sensor Detect
   - `Current Agent ID`: SCOUT
   - `Movement State`: ready
   - `Agent Coordinates`: (170.0, 130.0)
   - `Route Source` and `Route Destination`
   - `Animation Progress`: 0.0%
   - `Packet Attachment`: DETACHED

### Step 4: Start Continuous Robot Relay
1. Click the **RUN LOCOMOTION** button (or press `Spacebar`).
2. Observe the complete 12.5-second sequential relay across all 4 stages:

   - **Stage 1 (Seconds 0.0 – 3.1): SCOUT Traversal**
     - SCOUT departs dock (170, 130) and walks down Conduit 1 towards the Singularity.
     - SCOUT dock switches to `DEPLOYED / IN TRANSIT (TRANSIT [1/4])`.
     - Electric blue capsule `PKT #SCOUT • TRAVELLING` attaches to SCOUT.
     - **Observe the other 3 quadrants:**
       - NEXUS displays amber badge `STANDBY [2/4]`.
       - ORACLE displays amber badge `STANDBY [3/4]`.
       - SENTINEL displays amber badge `STANDBY [4/4]`.
       - *(They are intentionally waiting for their turn!)*

   - **Stage 2 (Seconds 3.1 – 6.2): NEXUS Traversal**
     - When SCOUT arrives at Singularity, packet handoff completes.
     - **NEXUS immediately activates and departs its dock (810, 130)!**
     - NEXUS dock switches to `TRANSIT [2/4]`.
     - Cyan capsule `PKT #NEXUS • TRAVELLING` attaches to NEXUS.
     - SCOUT, ORACLE, and SENTINEL display `STANDBY` badges.
     - NEXUS travels along Conduit 2 towards Singularity.

   - **Stage 3 (Seconds 6.2 – 9.4): ORACLE Traversal**
     - NEXUS arrives at Singularity and delivers packet.
     - **ORACLE immediately activates and departs its dock (810, 430)!**
     - ORACLE dock switches to `TRANSIT [3/4]`.
     - Purple capsule `PKT #ORACLE • TRAVELLING` attaches to ORACLE.
     - SCOUT, NEXUS, and SENTINEL display `STANDBY` badges.
     - ORACLE travels along Conduit 3 towards Singularity.

   - **Stage 4 (Seconds 9.4 – 12.5): SENTINEL Traversal**
     - ORACLE delivers packet.
     - **SENTINEL immediately activates and departs its dock (170, 430)!**
     - SENTINEL dock switches to `TRANSIT [4/4]`.
     - Crimson red capsule `PKT #SENTINEL • TRAVELLING` attaches to SENTINEL.
     - SCOUT, NEXUS, and ORACLE display `STANDBY` badges.
     - SENTINEL travels along Conduit 4 towards Singularity.

   - **Stage 5 (Cycle Repeat / Loop):**
     - SENTINEL arrives at Singularity and triggers alert dispatch.
     - The relay smoothly returns to Stage 1 (**SCOUT**), repeating indefinitely.

### Step 5: Test Interactive Controls
1. **Pause / Resume:**
   - While an agent is moving in the middle of a conduit, click `PAUSE TRANSIT` (or press `Spacebar`).
   - Verify the robot freezes in place; dock pad text changes to `PAUSED`.
   - Click `RESUME TRANSIT`; verify movement continues smoothly from that exact coordinate.
2. **Speed Multipliers:**
   - Click `1X` button; verify it cycles to `2X` (speed doubles) and `0.5X` (slow motion), then back to `1X`.
3. **Manual Stepping:**
   - Click the `FastForward` button (+15%); verify progress advances by 15% per click and cleanly transitions across all 4 agents.
4. **Reset:**
   - Click the `RotateCcw` button; verify locomotion stops, carrier resets to SCOUT, progress resets to 0%, and all agents return to parked dock state.

---

## 3. Operator Sign-off Checklist

| Verification Item | Expected Visual Result | Verified (Operator Initials) |
|---|---|---|
| **SCOUT Movement** | Travels from top-left dock to Singularity with blue packet | `[   ]` |
| **NEXUS Movement** | Departs top-right dock and travels to Singularity with cyan packet | `[   ]` |
| **ORACLE Movement** | Departs bottom-right dock and travels to Singularity with purple packet | `[   ]` |
| **SENTINEL Movement** | Departs bottom-left dock and travels to Singularity with red packet | `[   ]` |
| **Standby Feedback** | Non-carrier docks clearly indicate `STANDBY [LEG X/4]` while waiting | `[   ]` |
| **Diagnostics HUD** | Toggles via `H` key and displays accurate live coordinates | `[   ]` |
| **VCR Controls** | Pause, resume, step forward, cycle speeds, and reset work reliably | `[   ]` |
| **SOC Dashboard** | Return to Overview button works cleanly without console errors | `[   ]` |
