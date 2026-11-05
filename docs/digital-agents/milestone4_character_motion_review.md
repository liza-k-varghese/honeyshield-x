# HoneyShield X — Digital Agent Universe
## Milestone 4: Character Motion, Silhouette & Animation Review

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Target:** Robotic Digital Agents (SCOUT, NEXUS, ORACLE, SENTINEL)  
**Status:** FULLY VERIFIED & OPTIMIZED

---

## 1. Character Silhouette & Visual Identity Audit

Each of the four digital robotic agents has been engineered with a completely distinct SVG silhouette, color palette, sensor arrangement, and animated telemetry display.

```
+---------------------------------------------------------------------------------------+
| CHARACTER SILHOUETTE & VISUAL SYSTEM                                                  |
+-------------------+--------------------+-----------------------+----------------------+
| SCOUT             | NEXUS              | ORACLE                | SENTINEL             |
| Sensor Collection | Event Processing   | Threat Intelligence   | Alert Delivery       |
+-------------------+--------------------+-----------------------+----------------------+
| Compact Chassis   | Sleek Courier Body | Tall Analytical Frame | Heavy Armored Body   |
| Electric Blue     | Cyan Glow          | Violet Hologram       | Graphite & Crimson   |
| Visor Sweeper     | Dual LED Optics    | Optical Ring Cluster  | Dual Red Sensors     |
| Shoulder Antennas | Ear Comm Discs     | Floating Analysers    | Reinforced Shoulders |
| Hand Actuators    | Magnetic Gripper   | Precision Arm Caliper | Hydraulic Claw Grip  |
+-------------------+--------------------+-----------------------+----------------------+
```

### 1.1 SCOUT — Sensor & Data Collection Agent
- **Palette:** Electric Blue (`#3b82f6`, `#60a5fa`), Pure White (`#ffffff`), Deep Navy (`#1e293b`).
- **Head & Optics:** Horizontal scanning visor with an animated gradient sweep beam (`#60a5fa` oscillating $\pm 12\text{px}$). Twin omni-directional RF antenna poles on helmet ridge.
- **Shoulders & Chassis:** Dual shoulder radar dishes with concentric ring pulses; compact, aerodynamic torso suited for rapid field reconnaissance.
- **Arms & Hands:** Articulated servo arms with magnetic intake pads for snagging raw honeypot and telemetry packets from perimeter sensors.
- **Ground Shadow:** Elliptical SVG shadow (`rx="22" ry="6"`) with dynamic Gaussian blur (`feGaussianBlur stdDeviation="3"`).

### 1.2 NEXUS — Event Processor & Data Courier
- **Palette:** High-Tech Cyan (`#06b6d4`, `#22d3ee`), Polar White (`#f8fafc`), Carbon Slate (`#0f172a`).
- **Head & Optics:** Glossy obsidian face shield with dual glowing cyan LED oval eyes; circular acoustic/telemetry ear modules with pulsing audio visualizer bars.
- **Shoulders & Chassis:** Aerodynamic, streamlined courier chassis with glowing core data crystal emblem pulsing at $1.2\text{ Hz}$.
- **Arms & Hands:** Multi-jointed carbon-fiber arms featuring articulated dual-finger grippers that cradle and stabilize data cubes during high-speed transit.
- **Ground Shadow:** Synchronized drop shadow tracking coordinates with micro-scale modulation during hover bobbing.

### 1.3 ORACLE — Threat Intelligence & Deep Analysis Agent
- **Palette:** Mystic Violet (`#8b5cf6`, `#a855f7`), Deep Amethyst (`#581c87`), Titanium Silver (`#e2e8f0`).
- **Head & Optics:** Elongated analytical helmet housing a tri-aperture optical ring sensor; floating holographic HUD lens hovering $6\text{px}$ in front of optics.
- **Shoulders & Chassis:** Tall, slender crystalline chassis with floating coprocessor shoulder pylons and animated vertical data streams.
- **Arms & Hands:** Precision telemetric calipers equipped with non-contact scanning beams to inspect packet payload hashes without physical degradation.
- **Ground Shadow:** Soft-focus elliptical shadow calibrated for elevated floating altitude.

### 1.4 SENTINEL — Alert Delivery & Security Response Agent
- **Palette:** Crimson Warning Red (`#ef4444`, `#dc2626`), Armor Plate Graphite (`#374151`, `#1f2937`), Warning Amber (`#f59e0b`).
- **Head & Optics:** Angular blast-shield visor with fierce twin red optic slits and flashing alert beacon crest.
- **Shoulders & Chassis:** Heavy reinforced armor plating with ballistic shoulder mantlets and high-visibility chevron warning hazard striping.
- **Arms & Hands:** Heavy hydraulic clamp actuators designed to deliver critical incident payloads securely and execute containment lockdowns.
- **Ground Shadow:** Broad, dense shadow footprint reflecting heavy chassis mass and low center of gravity.

---

## 2. Motion Engine & Bézier Trajectory Math

Movement between operational nodes is driven by a precision Bézier interpolation engine implemented in `frontend/src/digital-agents/components/MovementPrototype.tsx` and `LiveDataFlow.tsx`.

### 2.1 Cubic Bézier Trajectory Definition
Trajectories are modeled using cubic Bézier curves spanning source to destination coordinates:
$$\mathbf{B}(t) = (1-t)^3 \mathbf{P}_0 + 3(1-t)^2 t \mathbf{P}_1 + 3(1-t) t^2 \mathbf{P}_2 + t^3 \mathbf{P}_3, \quad t \in [0, 1]$$
- **Source Node $\mathbf{P}_0$:** $(120, 200)$
- **Control Point 1 $\mathbf{P}_1$:** $(300, 80)$
- **Control Point 2 $\mathbf{P}_2$:** $(500, 320)$
- **Destination Node $\mathbf{P}_3$:** $(680, 200)$

This produces a signature gentle S-curve trajectory that avoids node collision and simulates intentional flight vector navigation.

### 2.2 Tangent Vector & Rotation Tracking
Character orientation aligns smoothly along the curve's velocity vector:
$$\mathbf{v}(t) = \mathbf{B}'(t) = 3(1-t)^2 (\mathbf{P}_1 - \mathbf{P}_0) + 6(1-t)t (\mathbf{P}_2 - \mathbf{P}_1) + 3t^2 (\mathbf{P}_3 - \mathbf{P}_2)$$
$$\theta(t) = \operatorname{atan2}(v_y(t), v_x(t)) \cdot \frac{180}{\pi}$$
The rotation angle is clamped between $-15^\circ$ and $+15^\circ$ to prevent unnatural tilting while giving an authentic banking sensation during acceleration.

### 2.3 Motion Phase Progression

| Progress ($t$) | State Name | Arm & Body Kinematics | Packet Behavior | Visual FX |
|----------------|------------|------------------------|-----------------|-----------|
| $0.00 \le t \le 0.18$ | **Ready / Pickup** | Character hovers above source node; arm articulates downward towards ground packet. | Packet stationary at $(120, 200)$; glow pulses at $2\text{ Hz}$. | Source node halo active; telemetry status shows "ready". |
| $0.18 < t < 0.95$ | **Carrying / In-Flight** | Character banks into curve; arm curls inward, gripping packet securely; hover bob $\Delta y = 3\sin(8\pi t)$. | Packet moves to $(x + 18, y + 6)$ relative to character center; rotates with body. | Particle trail behind character; speed telemetry updates; status "travelling". |
| $0.90 \le t < 0.95$ | **Waiting for ACK** | Character decelerates at $(680, 200)$; arm holds packet steady awaiting destination ACK. | Packet held at destination threshold. | Pulsing yellow amber halo; status "waiting". |
| $t \ge 0.95$ | **Delivery Confirmed** | Character extends arm forward; hand opens, releasing packet into target node socket. | Packet snaps to $(680, 200)$ node core; scale pulses $1.0 \to 1.25 \to 1.0$. | Green success burst (`#10b981`); status "confirmed". |

---

## 3. Speed Multipliers & Trajectory Modifiers

The movement prototype provides interactive speed multipliers and simulation toggles:
- **0.5x Multiplier:** Slow-motion inspection mode (~6000ms duration). Ideal for SOC training and frame-by-frame packet inspection.
- **1.0x Multiplier:** Standard operational speed (~3000ms duration). Natural, smooth courier pacing.
- **2.0x Multiplier:** High-throughput alert surge mode (~1500ms duration). Rapid dispatch under heavy event loads.
- **Simulate Failure Mode:** When toggled, trajectory path stroke transforms to warning red (`#ef4444`). At $t = 0.85$, character halts, amber warning lights flash, packet turns red with a warning icon, and retry counter increments with an exponential backoff countdown.

---

## 4. Four-Agent Sequential Relay Chain

In addition to single-character traversal, the system features a verified 4-Agent Relay Chain:
1. **Stage 1 (SCOUT):** Harvests raw honeypot packet at Perimeter Sensor $\to$ Transports to Ingestion Gateway $(120 \to 300)$.
2. **Stage 2 (NEXUS):** Picks up parsed event $\to$ Transports across Enterprise Bus to Analysis Engine $(300 \to 500)$.
3. **Stage 3 (ORACLE):** Picks up correlated threat payload $\to$ Transports to Alert Triage Queue $(500 \to 680)$.
4. **Stage 4 (SENTINEL):** Picks up verified high-severity alert $\to$ Delivers to SOC Incident Dispatch $(680 \to 860)$.

Each handoff smoothly transfers the cryptographic payload packet from predecessor gripper to successor receiver without visual discontinuity or coordinate snapping.

---

## 5. Reduced-Motion Mode & Accessibility

For operators with vestibular sensitivity or systems running under reduced graphical performance:
- The system listens to the browser media query:
  ```css
  @media (prefers-reduced-motion: reduce) { ... }
  ```
- When active, the movement engine:
  1. Sets animation duration to $0\text{ms}$.
  2. Cancels the `requestAnimationFrame` interpolation loop.
  3. Bypasses continuous Bézier translation and hover bobbing.
  4. Immediately renders the character at the target destination with status "confirmed".
  5. Keeps all data packet inspectors, telemetry badges, and node details 100% accessible and readable.

This behavior has been verified with automated unit tests in `milestone4_browser_motion.test.tsx`.

