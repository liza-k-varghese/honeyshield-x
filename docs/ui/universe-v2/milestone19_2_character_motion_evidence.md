# HoneyShield X — Milestone 19.2: Character Motion & Locomotion Evidence

**Component:** `UniverseCommandCenter.tsx` & `characters.tsx`  
**Animation Model:** Quadratic Bézier Conduits with Articulated Kinematic Phase Engine  
**Refresh Target:** 60 FPS Browser Frame Budget  

---

## 1. Mathematical Locomotion Engine

Physical character traversal follows parametric Quadratic Bézier curves defined by:
$$B(t) = (1 - t)^2 P_0 + 2(1 - t)t P_c + t^2 P_1, \quad t \in [0, 1]$$

Where:
- $P_0$: Origin node coordinates in territory quadrant.
- $P_c$: Arc curvature midpoint guiding gravitational bend around the Event Singularity.
- $P_1$: Destination node coordinates at the target agent or core gateway.

```
       [P0: Origin Node]
               \
                \     [Pc: Conduit Arc Control]
                 \       /
                  \     /
                   v   v
            [P1: Destination Node]
```

---

## 2. Phase-by-Phase Kinematic Breakdown

Each robot transition cycle executes 6 sequential deterministic states:

| Phase | Parameter Range ($t$) | Visual Animation Behavior | Packet Synchronization |
| :--- | :--- | :--- | :--- |
| **`ready`** | $t = 0.0$ | Robot hovers or idles in home quadrant; antenna or sensors active. | Packet unspawned or anchored at origin node. |
| **`approach`** | $0.0 < t \le 0.18$ | Character tilts forward $8^\circ$, glides along entry vector toward the packet. | Packet initiates luminous pulse ($r = 10\text{px}$). |
| **`pickup`** | $0.18 < t \le 0.32$ | Gripper arms or energy manipulators extend; magnetic attachment clamp engages. | Packet docks to character mount point with radiant bloom. |
| **`transit`** | $0.32 < t \le 0.78$ | Full character body displaces smoothly along Bézier curve $B(t)$. | Packet coordinates locked to character position $(x(t), y(t))$. |
| **`waiting`** | $0.78 < t \le 0.88$ | Character decelerates at threshold; awaits outbox transaction confirmation. | Packet glows steady; eliminates jarring immediate handoff. |
| **`delivering`** | $0.88 < t \le 1.0$ | Manipulators disengage; packet transfers to receiving agent or singularity core. | Packet releases into receptacle; handoff confirmation emitted. |

---

## 3. Individual Character Acceptance Profiles

### 3.1 SCOUT (Sensor Frontier — Electric Blue `#3B82F6`)
- **Morphology:** Aerostat quad-rotor drone with high-gain parabolic dish and sweep sensor.
- **Starting Position:** $(220, 200)$
- **Conduit to Nexus:** $P_0(220, 200) \to P_c(600, 140) \to P_1(980, 200)$
- **Observed Locomotion:** Aerodynamic banking along northern orbital perimeter; radar beam maintains scanning arc during traversal.

### 3.2 NEXUS (Processing Core — Cyber Cyan `#06B6D4`)
- **Morphology:** Articulated bipedal neural platform with floating orbital rings.
- **Starting Position:** $(980, 200)$
- **Conduit to Oracle:** $P_0(980, 200) \to P_c(1040, 420) \to P_1(980, 640)$
- **Observed Locomotion:** Dual-ring gyroscopic rotation; neural chest core flares in cyan as outbox entry commits.

### 3.3 ORACLE (Intelligence Sanctum — Mystic Purple `#8B5CF6`)
- **Morphology:** Levitation ocular prism surrounded by floating predictive glyphs.
- **Starting Position:** $(980, 640)$
- **Conduit to Sentinel:** $P_0(980, 640) \to P_c(600, 700) \to P_1(220, 640)$
- **Observed Locomotion:** Glyphs oscillate in formation around the prism as it navigates the southern conduit.

### 3.4 SENTINEL (Response Bastion — Vanguard Red `#EF4444`)
- **Morphology:** Reinforced walker with dual kinetic containment shields.
- **Starting Position:** $(220, 640)$
- **Conduit to Scout:** $P_0(220, 640) \to P_c(160, 420) \to P_1(220, 200)$
- **Observed Locomotion:** Heavy kinetic cadence; barrier shields flare with red containment field on packet docking.

---

## 4. VCR & Motion Controls Acceptance

- **Speed Multiplier:** Verified across $1\times$, $2\times$, and $4\times$ rates. Step increment scales velocity linearly without skipping frames.
- **Pause / Resume:** Pressing `Space` halts $t$ calculation immediately; resumption continues from the exact fractional offset.
- **Reduced Motion:** When activated, Bézier curve animation is bypassed; characters render stationary in their respective territories with static status glyphs.

