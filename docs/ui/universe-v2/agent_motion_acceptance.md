# HoneyShield X — Digital Agent Locomotion & Packet Transit Acceptance

## 1. Character Engine Integrity

The original SVG articulated characters with distinct animated appendages, visors, antenna sensors, and carrying limbs are fully preserved:
- [`ScoutCharacter`](file:///home/liza/HoneyShield-X/frontend/src/digital-agents/characters.tsx#L12)
- [`NexusCharacter`](file:///home/liza/HoneyShield-X/frontend/src/digital-agents/characters.tsx#L85)
- [`OracleCharacter`](file:///home/liza/HoneyShield-X/frontend/src/digital-agents/characters.tsx#L160)
- [`SentinelCharacter`](file:///home/liza/HoneyShield-X/frontend/src/digital-agents/characters.tsx#L235)

## 2. Physical Locomotion & Handoff Progression

Unlike static icons connected by dashed lines, characters physically navigate across the orbital stage:

1. **Phase 1: Approaching ($0.0 \le t < 0.14$):**
   Agent prepares for extraction, visor scans origin node (`state = 'observing'`).
2. **Phase 2: Packet Pickup ($0.14 \le t < 0.26$):**
   Agent engages arm grasp and loads geometric glowing packet capsule (`state = 'pickup'`, `carryingPacket = true`).
3. **Phase 3: Travelling Conduit ($0.26 \le t < 0.82$):**
   Agent navigates along the curved Quadratic Bézier energy path connecting territory to Event Singularity with responsive velocity (`state = 'travelling'`).
4. **Phase 4: Node Arrival & Delivery ($0.82 \le t < 0.94$):**
   Agent approaches Singularity interface and extends delivery arm (`state = 'delivering'`).
5. **Phase 5: Confirmed ACID Handoff ($0.94 \le t \le 1.0$):**
   Event Singularity receives packet, confirms monotonic cursor update, and next relay agent takes over (`state = 'confirmed'`).

## 3. VCR Interactive Controls

- **Run / Pause Locomotion:** Toggles continuous physical agent traversal across all 4 relay legs.
- **Step Forward:** Advances travel position by $+15\%$ for granular forensic inspection.
- **Speed Multiplier:** Toggles between $1\times$ and $2\times$ rendering speed.
- **Reset:** Resets progress to origin at $0\%$ and stops transit.

