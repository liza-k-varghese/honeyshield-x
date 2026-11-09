# HoneyShield X — Milestone 54: Deliverable 02
## Observable Relay State Model & Architecture Specification

**Repository:** `/home/liza/HoneyShield-X`  
**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland  
**Target Browser:** Mozilla Firefox 140.16.0esr  

---

### 1. Architectural Philosophy

In complex distributed character animations, testing cannot rely on transient DOM element presence or arbitrary sleep delays. HoneyShield X implements an **Observable Relay State Model** that exposes the deterministic mathematical state of all four robotic agents directly to automated test harnesses and developer diagnostic panels.

The model is maintained inside [`frontend/src/components/UniverseCommandCenter.tsx`](file:///home/liza/HoneyShield-X/frontend/src/components/UniverseCommandCenter.tsx) and synchronized continuously to `window.__HSX_RELAY_STATE__`.

---

### 2. Observable Schema Specification

```typescript
export interface ObservableAgentState {
  agentId: 'scout' | 'nexus' | 'oracle' | 'sentinel';
  relayRunId: string;
  transferId: string;
  stage: 'idle' | 'waiting' | 'pickup' | 'travelling' | 'waiting_turn' | 'delivering' | 'completed' | 'paused';
  status: 'docked' | 'travelling' | 'delivering' | 'waiting_turn' | 'paused' | 'nominal';
  sourceNode: string;
  destinationNode: string;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  destinationPosition: { x: number; y: number };
  progress: number; // 0.0 to 1.0
  packetAttached: boolean;
  startedAt: string | null;
  lastUpdatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  reasonForWaiting: string;
}

export interface ObservableRelayModel {
  mode: 'DEMO' | 'LIVE' | 'REPLAY' | 'STANDBY';
  relayRunId: string;
  currentAgent: 'scout' | 'nexus' | 'oracle' | 'sentinel';
  currentStage: number; // 1 to 4
  movementProgress: number; // 0.0 to 1.0
  isLocomotionPlaying: boolean;
  locomotionSpeed: number; // 0.5, 1.0, 2.0
  lastEvent: string;
  failureReason: string | null;
  agents: Record<'scout' | 'nexus' | 'oracle' | 'sentinel', ObservableAgentState>;
}
```

---

### 3. Agent Lifecycle & Reason Codes

Every robot maintains an explicit reason for its current state, making it immediately transparent why an agent is moving or waiting:

| Agent Status | Condition | Exposed Reason Code (`reasonForWaiting`) |
|---|---|---|
| **IDLE** | Locomotion not started | `Standing by in quadrant bay` |
| **WAITING TURN** | Another agent is currently active | `Waiting for {AGENT} (Leg {N}/4) to complete transfer` |
| **ACTIVE** | Current active carrier in transit | `Movement active` |
| **PAUSED** | Paused by operator via Space or UI | `Relay paused by operator` |
| **COMPLETED** | Leg finished, waiting for next cycle | `Stage completed; awaiting next cycle` |

---

### 4. Conduit Coordinates & Geometries

The four conduits originate in their respective quadrant bays and converge upon the Event Singularity perimeter:

```
SCOUT Dock (170, 130)   ------\
                               \
NEXUS Dock (810, 130)   ----\   \---> Event Singularity (480-520, 280-300)
                             \  /
ORACLE Dock (810, 430)  ----/ /
                             /
SENTINEL Dock (170, 430) ---/
```

- **Leg 1 — SCOUT (Top-Left):** $P_0(170, 130) \to P_c(310, 190) \to P_1(480, 280)$
- **Leg 2 — NEXUS (Top-Right):** $P_0(810, 130) \to P_c(670, 190) \to P_1(520, 280)$
- **Leg 3 — ORACLE (Bottom-Right):** $P_0(810, 430) \to P_c(670, 370) \to P_1(520, 300)$
- **Leg 4 — SENTINEL (Bottom-Left):** $P_0(170, 430) \to P_c(310, 370) \to P_1(480, 300)$

---

### 5. Architectural Guarantees

1. **State Independence:** Each agent's observable state is computed independently without mutating sibling states.
2. **Zero Polling Overhead:** Synchronized within React's standard reactive cycle.
3. **External Test Access:** Fully accessible to headless testing frameworks (`WebDriver:ExecuteScript`) via `window.__HSX_RELAY_STATE__`.
