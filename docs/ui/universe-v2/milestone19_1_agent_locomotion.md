# HoneyShield X — Milestone 19.1: Real Physical Agent Locomotion

## 1. Character Architecture & Preservation

The original SVG articulated characters are strictly preserved without downgrade:
- **SCOUT** (`ScoutCharacter.tsx`): reconnaissance robot with scanning optics, articulated legs, antenna sensor, and blue packet carry gripper.
- **NEXUS** (`NexusCharacter.tsx`): white-and-silver courier robot with dual illuminated cyan eyes, side rotary pods, and high-energy data core.
- **ORACLE** (`OracleCharacter.tsx`): tall analytical robot with purple optics, floating holographic sensors, and analysis apparatus.
- **SENTINEL** (`SentinelCharacter.tsx`): armored tactical bastion robot with crimson optics, reinforced pauldrons, and alert beacon.

## 2. Mathematical Locomotion Engine

Character movement across the orbital universe uses Quadratic Bézier coordinate interpolation:
$$\mathbf{B}(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$$

Where:
- $P_0$: Origin node coordinates at agent territory outpost.
- $P_1$: Mid-orbit conduit curve control point.
- $P_2$: Destination node at Event Singularity interface.

### Stage Progression:
1. `approaching` ($0.0 \le t < 0.14$): Character focuses optics on origin node (`state = 'observing'`).
2. `pickup` ($0.14 \le t < 0.26$): Arms extend and grasp luminous packet capsule (`state = 'pickup'`, `carryingPacket = true`).
3. `travelling` ($0.26 \le t < 0.78$): Body physically translates along the conduit curve (`state = 'travelling'`).
4. `waiting` ($0.78 \le t < 0.88$): Character arrives at Singularity perimeter and enters confirmation standby (`state = 'waiting'`).
5. `delivering` ($0.88 \le t < 0.96$): Character extends delivery arm into Singularity receiver (`state = 'delivering'`).
6. `confirmed` ($0.96 \le t \le 1.0$): Outbox transaction confirms commit, next courier activates (`state = 'confirmed'`).

## 3. Interactive VCR Controls

- **Run / Pause Transit (`Space`):** Starts and pauses character translation smoothly at current spatial coordinates without teleportation.
- **Step Forward:** Increments progress by $+15\%$ for frame-by-frame mechanical analysis.
- **Speed Toggle ($1\times / 2\times$):** Dynamically adjusts progress delta.
- **Reset:** Re-docks active agent to territory base and resets packet state to origin.

