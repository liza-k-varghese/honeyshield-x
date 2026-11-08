# HoneyShield X — Milestone 53: Deliverable 10
## Human Operator Verification Runbook & Visual Acceptance Guide

**Repository:** `/home/liza/HoneyShield-X`  
**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland  
**Target Browser:** Mozilla Firefox  

---

### 1. Purpose of This Runbook

This guide is designed specifically for the human operator to personally verify the complete four-agent robot relay, packet attachment, and real-time animation in their native Firefox desktop browser session.

Follow these simple, sequential steps to confirm that all four robots physically move and that the previous defect is completely resolved.

---

### 2. Step-by-Step Operator Verification Procedure

#### Step 1: Open HoneyShield X in Firefox
1. Open your native desktop **Mozilla Firefox** browser.
2. Navigate to:
   $$\text{\texttt{http://127.0.0.1:5173}}$$
3. If not already authenticated, click the **Sign In** button (pre-seeded credentials: `admin_chief` / `AdminPass123!`).
4. Confirm that the **Security Overview** dashboard loads with dark-themed telemetry tiles.

#### Step 2: Navigate to Digital Agent Universe
1. In the top navigation bar or left sidebar, click **Digital Universe** (or navigate directly to `http://127.0.0.1:5173/?view=universe`).
2. Observe the central glowing **Event Singularity** and the four agent quadrants:
   - **SCOUT (Blue)** in the top-left quadrant.
   - **NEXUS (Cyan)** in the top-right quadrant.
   - **ORACLE (Purple)** in the bottom-left quadrant.
   - **SENTINEL (Red)** in the bottom-right quadrant.

#### Step 3: Open the Developer Diagnostics HUD (Optional but Recommended)
1. Press the keyboard key `H` or click the **DEV HUD** button in the top controls.
2. Observe the translucent diagnostics overlay in the top-right corner. It displays:
   - `Active Agent:` Current carrier name
   - `Movement State:` (DOCK, PICKUP, TRANSIT, WAITING, DELIVERY)
   - `Animation Progress:` Real-time numerical percentage ($0\%$ to $100\%$)
   - `Agent Coordinates:` Real-time $(X, Y)$ coordinate readout

#### Step 4: Start the Four-Robot Relay
1. Look at the locomotion control bar beneath the central universe canvas.
2. Click the **Play** button (or press `Space`).
3. Carefully watch the sequential movement of the four agents:

   - **Leg 1 — SCOUT (Top-Left):**
     SCOUT undocks and physically travels down the curved conduit toward the central core. A bright electric blue capsule (`PKT #SCOUT • TRAVELLING`) is clamped to its chest. It delivers the packet and returns to standby.
   
   - **Leg 2 — NEXUS (Top-Right):**
     *Notice that NEXUS now immediately undocks and moves!* NEXUS glides down its curved conduit toward the central core with a glowing cyan capsule (`PKT #NEXUS • TRAVELLING`). It delivers the packet to the Singularity.

   - **Leg 3 — ORACLE (Bottom-Left):**
     ORACLE undocks and physically travels up its conduit toward the central core with a purple capsule (`PKT #ORACLE • TRAVELLING`). It delivers the packet.

   - **Leg 4 — SENTINEL (Bottom-Right):**
     *Notice that SENTINEL now immediately undocks and moves!* SENTINEL glides up its conduit toward the central core with a glowing crimson capsule (`PKT #SENTINEL • TRAVELLING`). It completes the remediation cycle.

   - **Continuous Looping:**
     After SENTINEL finishes, the sequence smoothly cycles back to SCOUT for the next rotation without any stutter, skip, or freezing.

#### Step 5: Test Interactive Controls
1. **Pause / Resume:** Press `Space` while any robot is mid-flight. Confirm that the robot freezes in place and the bottom badge displays `STATUS: PAUSED`. Press `Space` again to resume fluid motion.
2. **Speed Controls:** Click `1.0X` to cycle between `0.5X` (slow-motion analysis), `1.0X` (standard speed), and `2.0X` (rapid demo). Confirm that all four robots move at each speed.
3. **Step Advancing:** With the relay paused, click **Step** (or press `S`) to advance the robot in $+10\%$ steps along its conduit.
4. **Reset:** Press `R` or click **Reset**. Confirm that the active agent resets to SCOUT ($0/4$) and all robots return to docked positions.

---

### 3. Operator Verification Checklist

Use this checklist during your personal inspection:

- [ ] All 4 robots (**SCOUT**, **NEXUS**, **ORACLE**, and **SENTINEL**) are visible in their respective quadrants.
- [ ] During the relay, **SCOUT** physically moves along its curved conduit.
- [ ] During the relay, **NEXUS** physically moves along its curved conduit (previously stationary).
- [ ] During the relay, **ORACLE** physically moves along its curved conduit.
- [ ] During the relay, **SENTINEL** physically moves along its curved conduit (previously stationary).
- [ ] Each robot carries a glowing data capsule during transit that matches its agent color.
- [ ] The packet capsule detaches cleanly at the central core before the next agent undocks.
- [ ] The bottom status bar accurately displays `CARRIER`, `STAGE`, `PROGRESS`, and `STATUS`.
- [ ] Pressing `Space` reliably pauses and resumes movement.

---

### 4. Operator Sign-Off Action

Once you have personally observed that all four robots physically travel during their respective turns, you can grant final acceptance for the Digital Agent Universe.
