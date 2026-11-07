# HoneyShield X — Milestone 19.3: Four-Agent Live Showcase & Demonstration Protocol

**Component:** `UniverseCommandCenter.tsx`  
**Modes Supported:** Real-Time Live Telemetry (`LIVE STREAM`) & Synthetic Simulation (`DEMO MODE`)  
**Design Mandate:** Non-Intrusive, Repeatable, and 100% Production-Isolated  

---

## 1. The Interactive Guided Showcase Overlay

In Milestone 19.3, `UniverseCommandCenter.tsx` introduces an operator-friendly **Showcase Guide Modal** accessible via:
- Clicking the **`SHOWCASE GUIDE`** button in the top action bar.
- Pressing keyboard hotkey `G` or `?`.
- Dismissible via `Escape` or the **`ENTER UNIVERSE SHOWCASE`** button.

The guide introduces operators to:
1. **The Event Singularity:** Center coordinate $(600, 420)$ coordinating outbox ingestion.
2. **Four Robotic Agents:** Individual territorial roles, character morphologies, and visual signatures.
3. **Locomotion Engine:** 6-phase kinematic cycle along Quadratic Bézier energy paths.
4. **Demonstration Controls:** VCR playback, speed multipliers, camera focus presets, and one-click diagnostic exports.

---

## 2. Four-Robot Movement Showcase Specifications

### 2.1 SCOUT (Sensor Frontier — Electric Blue `#3B82F6`)
- **Starting Node:** Coordinate $(220, 200)$ in the northwest quadrant.
- **Kinematic Sequence:**
  1. Forward body pitch ($8^\circ$) as radar dish sweeps the sector.
  2. Pickup arms extend; glowing blue telemetry packet attaches magnetically.
  3. Body glides across the northern Quadratic Bézier conduit toward coordinate $(980, 200)$.
  4. Waits at threshold for outbox transaction confirmation.
  5. Handoff completes; blue packet transfers to NEXUS courier platform.

### 2.2 NEXUS (Processing Core — Cyber Cyan `#06B6D4`)
- **Starting Node:** Coordinate $(980, 200)$ in the northeast quadrant.
- **Kinematic Sequence:**
  1. Accepts telemetry handoff from SCOUT.
  2. Chest neural core flares in cyan; gyroscopic data rings rotate.
  3. Traverses eastern orbital conduit toward coordinate $(980, 640)$ carrying normalized outbox packet.
  4. Delivers packet to ORACLE analysis aperture.

### 2.3 ORACLE (Intelligence Sanctum — Mystic Purple `#8B5CF6`)
- **Starting Node:** Coordinate $(980, 640)$ in the southeast quadrant.
- **Kinematic Sequence:**
  1. Runic glyphs expand in orbital formation around the levitating prism.
  2. Threat intelligence correlation calculates risk score ($96.4$).
  3. Navigates southern conduit toward coordinate $(220, 640)$ carrying purple enriched IOC packet.
  4. Transfers high-risk exploit event to SENTINEL response bastion.

### 2.4 SENTINEL (Response Bastion — Vanguard Red `#EF4444`)
- **Starting Node:** Coordinate $(220, 640)$ in the southwest quadrant.
- **Kinematic Sequence:**
  1. Heavy kinetic cadence; dual containment shields engage.
  2. Receives confirmed critical alert payload.
  3. Moves along western return conduit toward core containment gateway.
  4. Activates crimson defensive forcefield barrier deflection.

---

## 3. Four-Agent Demonstration Controls

- **Run / Pause:** Click **RUN LOCOMOTION** or press `Space`.
- **Speed Multipliers:** Toggle `1x`, `2x`, or `4x` for rapid demonstration reviews.
- **Step Navigation:** Click **STEP** to increment transit by discrete $10\%$ frames.
- **Reset:** Click **RESET** (or press `R`) to return all characters and packets to home coordinates.
- **Restart Without Reload:** Demonstration loops seamlessly and can be triggered indefinitely without refreshing the browser.
- **Production Isolation Guarantee:** In Demo Mode (`isDemoMode === true`), all packet movements and handoffs run in local client memory. Zero synthetic demonstration actions create records in production databases or trigger actual containment actions.

