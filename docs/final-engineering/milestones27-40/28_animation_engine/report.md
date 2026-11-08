# Milestone 28 — Deterministic Character Locomotion & Packet Attachment Engine

**Release Candidate:** `v1.0.0-rc5`  
**Engine Architecture:** 60 FPS `requestAnimationFrame` loop, Quadratic Bézier curves, attached packet socket, SVG articulated character bodies.  
**Target Component:** `frontend/src/components/UniverseCommandCenter.tsx`  
**Status:** **PASSED / VERIFIED**  

---

## 1. Engine Specifications

Milestone 28 upgrades the Digital Agent Universe from stationary dock animations to a deterministic spatial flight engine. The four cybersecurity robots physically depart their docks, traverse the universe along calculated Bézier curves, carry an attached payload packet, dynamic bank into curves, and hand off the packet at the destination node.

### Mathematical Formulation of Flight Trajectory

For each relay leg between Origin Pad $P_0 = (x_0, y_0)$ and Target Pad $P_1 = (x_1, y_1)$, the flight curve is governed by a quadratic Bézier with an offset apex control point $P_{\text{ctrl}} = (x_c, y_c)$:

$$P(t) = (1-t)^2 P_0 + 2(1-t)t P_{\text{ctrl}} + t^2 P_1, \quad t \in [0, 1]$$

Where:
$$x_c = \frac{x_0 + x_1}{2} - \sin(\theta_0) \cdot h_{\text{arc}}$$
$$y_c = \frac{y_0 + y_1}{2} + \cos(\theta_0) \cdot h_{\text{arc}}$$

The dynamic banking angle $\phi(t)$ is derived from the first derivative velocity vector:

$$V(t) = P'(t) = 2(1-t)(P_{\text{ctrl}} - P_0) + 2t(P_1 - P_{\text{ctrl}})$$
$$\phi(t) = \operatorname{clamp}\left(\operatorname{atan2}(V_y(t), V_x(t)) \times 0.25, -28^\circ, +28^\circ\right)$$

This creates smooth, aeronautically convincing tilting as the robot maneuvers across the Universe.

---

## 2. Relay Handoff Lifecycle

The four-agent relay chain executes deterministically in sequence:

```
[INGESTION EVENT] 
       │
       ▼
 [1. SCOUT] (Blue #3B82F6) 
  Traverses from Scout Dock to Nexus Dock carrying Raw Telemetry Packet #0
       │  Handoff at t=1.0
       ▼
 [2. NEXUS] (Cyan #00E5FF)
  Traverses from Nexus Dock to Oracle Dock carrying Normalized Pipeline Packet #1
       │  Handoff at t=1.0
       ▼
 [3. ORACLE] (Purple #A855F7)
  Traverses from Oracle Dock to Sentinel Dock carrying Enriched Threat Intel Packet #2
       │  Handoff at t=1.0
       ▼
 [4. SENTINEL] (Red #EF4444)
  Traverses from Sentinel Dock to Scout/Origin carrying Mitigation Lockdown Packet #3
       │  Cycle Completed
       ▼
[ISOLATION ENFORCED & CYCLE RESET]
```

---

## 3. Packet Attachment Socket & Dock Departure

1. **Packet Socket:**
   The traveling robot container (`.hsx-travelling-agent`) encapsulates both the articulated robot character SVG and the payload packet (`.hsx-carrier-payload`). The payload is rendered with a pulsing glow matching the agent's theme color and an attached telemetry badge (`PKT #<STAGE> • TRAVELLING`).
2. **Dock State Departure Indicator:**
   When an agent is traveling ($t \in (0, 1)$), the origin dock switches from static idle robot to `DEPLOYED / IN TRANSIT` (or `DEPLOYED / PAUSED`), completely eliminating duplicate robot rendering on screen.
3. **Hardware Acceleration:**
   CSS `will-change: left, top, transform;` is applied to `.hsx-travelling-agent` to ensure compositor-thread execution at 60 FPS without layout recalculations.

---

## 4. Test Verification

Automated suite in `frontend/src/tests/universe_command_center.test.tsx`:
- `initializes in ready state with full docked agents and prominent return-to-overview action` — **PASSED**
- `toggles locomotion playback and transitions dock into DEPLOYED / IN TRANSIT state` — **PASSED**
- `steps forward through relay chain, cycles speeds, and resets to origin` — **PASSED**
- All 16 tests in `universe_command_center.test.tsx` — **PASSED (100%)**
