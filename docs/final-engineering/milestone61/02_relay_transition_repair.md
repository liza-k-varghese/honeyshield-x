# HoneyShield X — Milestone 61: Deliverable 02
## Relay Transition Engine Repair: Pure Reducer Architecture

**Application:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Target Repository:** `/home/liza/HoneyShield-X`  
**Target Component:** `frontend/src/components/UniverseCommandCenter.tsx`  
**Execution Date:** November 8, 2026  
**Author:** Principal React Systems & State Architecture Team  

---

### 1. Architectural Solution: `relayEngineReducer`

Milestone 61 eliminated all fragmented state setters and nested side-effects by unifying the character relay state machine into a pure reducer:

```typescript
export interface RelayEngineState {
  agentIndex: number;
  stageStepIndex: number;
  locomotionStage: LocomotionStage;
  runCount: number;
  runId: string;
  isPlaying: boolean;
  isReplayingHistorical: boolean;
}

export type RelayEngineAction =
  | { type: 'ADVANCE_STAGE'; totalAgents?: number }
  | { type: 'SET_STAGE'; stage: LocomotionStage }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'TRIGGER_REPLAY' }
  | { type: 'RESET' }
  | { type: 'STEP_STAGE_MANUAL'; stepIndex: number };
```

---

### 2. Mathematical Definition of Pure Reducer

The reducer operates as an immutable state transformation function with **zero external dependencies and zero side-effects**:

```typescript
export function relayEngineReducer(
  state: RelayEngineState,
  action: RelayEngineAction
): RelayEngineState {
  switch (action.type) {
    case 'ADVANCE_STAGE': {
      const total = action.totalAgents || 4;
      
      // Pure exit condition for historical replay mode
      if (state.isReplayingHistorical && state.agentIndex === total - 1) {
        return {
          ...state,
          isPlaying: false,
          isReplayingHistorical: false,
          locomotionStage: 'ready',
        };
      }

      const nextAgentIndex = (state.agentIndex + 1) % total;
      const isCycleComplete = nextAgentIndex === 0;
      const nextRunCount = isCycleComplete ? state.runCount + 1 : state.runCount;
      const nextRunId = isCycleComplete ? `RUN-${nextRunCount}` : state.runId;

      return {
        ...state,
        agentIndex: nextAgentIndex,
        stageStepIndex: (state.stageStepIndex + 1) % total,
        locomotionStage: 'approaching',
        runCount: nextRunCount,
        runId: nextRunId,
      };
    }

    case 'SET_STAGE': {
      if (state.locomotionStage === action.stage) return state;
      return {
        ...state,
        locomotionStage: action.stage,
      };
    }

    case 'TOGGLE_PLAY': {
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };
    }

    case 'SET_PLAYING': {
      if (state.isPlaying === action.isPlaying) return state;
      return {
        ...state,
        isPlaying: action.isPlaying,
      };
    }

    case 'TRIGGER_REPLAY': {
      return {
        ...state,
        agentIndex: 0,
        stageStepIndex: 0,
        locomotionStage: 'ready',
        isPlaying: true,
        isReplayingHistorical: true,
      };
    }

    case 'RESET': {
      const nextRunCount = state.runCount + 1;
      return {
        ...state,
        agentIndex: 0,
        stageStepIndex: 0,
        locomotionStage: 'ready',
        isPlaying: false,
        isReplayingHistorical: false,
        runCount: nextRunCount,
        runId: `RUN-${nextRunCount}`,
      };
    }

    case 'STEP_STAGE_MANUAL': {
      return {
        ...state,
        stageStepIndex: action.stepIndex,
      };
    }

    default:
      return state;
  }
}
```

---

### 3. Key Invariants & Guarantees

1. **Strict Mode Idempotence:**
   For any given state $S$ and action $A$:
   $$\text{relayEngineReducer}(S, A) \equiv \text{relayEngineReducer}(S, A)$$
   Invoking the reducer multiple times produces identical output objects without mutating $S$ or altering external system variables.
2. **Atomic Rollover Synchronization:**
   When `nextAgentIndex === 0` (transitioning from SENTINEL back to SCOUT), `runCount` increments by 1, and `runId` updates to `RUN-${runCount}` in the exact same render cycle.
3. **Decoupled Numerical Integration:**
   High-frequency coordinate mathematics remain inside `progressRef.current`, cleanly separated from discrete stage dispatches.
4. **Deterministic Cleanups:**
   When historical replay completes, `isPlaying` transitions to `false` immutably, triggering clean cancellation of `requestAnimationFrame` via standard React `useEffect`.
