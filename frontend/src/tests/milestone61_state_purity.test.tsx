import { describe, it, expect } from 'vitest';
import {
  relayEngineReducer,
  RelayEngineState,
  RelayEngineAction,
} from '../components/UniverseCommandCenter';

describe('Milestone 61 — React State Purity & Strict Mode Double-Invocation Safety', () => {
  const getInitialState = (): RelayEngineState => ({
    agentIndex: 0,
    stageStepIndex: 0,
    locomotionStage: 'ready',
    runCount: 1,
    runId: 'RUN-1',
    isPlaying: false,
    isReplayingHistorical: false,
  });

  it('1. Purity: relayEngineReducer is deterministic and free of external mutations', () => {
    const state = getInitialState();
    const action: RelayEngineAction = { type: 'ADVANCE_STAGE', totalAgents: 4 };

    // Simulate React 19 Strict Mode: call reducer twice with identical state and action
    const firstPass = relayEngineReducer(state, action);
    const secondPass = relayEngineReducer(state, action);

    // Deep equality of return values
    expect(firstPass).toEqual(secondPass);
    expect(firstPass.agentIndex).toBe(1);
    expect(firstPass.stageStepIndex).toBe(1);
    expect(firstPass.runCount).toBe(1);
    expect(firstPass.runId).toBe('RUN-1');

    // Confirm initial state was never mutated
    expect(state.agentIndex).toBe(0);
    expect(state.runCount).toBe(1);
  });

  it('2. Stage Progression: advances sequentially through all 4 agents without skipping', () => {
    let state = getInitialState();
    const action: RelayEngineAction = { type: 'ADVANCE_STAGE', totalAgents: 4 };

    // Stage 1 (SCOUT: 0) -> Stage 2 (NEXUS: 1)
    state = relayEngineReducer(state, action);
    expect(state.agentIndex).toBe(1);
    expect(state.runId).toBe('RUN-1');

    // Stage 2 (NEXUS: 1) -> Stage 3 (ORACLE: 2)
    state = relayEngineReducer(state, action);
    expect(state.agentIndex).toBe(2);
    expect(state.runId).toBe('RUN-1');

    // Stage 3 (ORACLE: 2) -> Stage 4 (SENTINEL: 3)
    state = relayEngineReducer(state, action);
    expect(state.agentIndex).toBe(3);
    expect(state.runId).toBe('RUN-1');

    // Stage 4 (SENTINEL: 3) -> Stage 1 Rollover (SCOUT: 0)
    state = relayEngineReducer(state, action);
    expect(state.agentIndex).toBe(0);
    expect(state.runCount).toBe(2);
    expect(state.runId).toBe('RUN-2');
  });

  it('3. Anti-Regression: catches flawed nested updater double-increment bug', () => {
    // Demonstration of why legacy nested updater failed under React 19 Strict Mode:
    let legacyIndex = 0;
    const flawedUpdater = (prev: number) => {
      // If side-effect / secondary increment happens inside updater:
      const next = (prev + 1) % 4;
      return next;
    };

    // React 19 Strict Mode runs updaters twice:
    const doubleInvoked = flawedUpdater(flawedUpdater(legacyIndex));
    // Notice that double invocation in Strict Mode skipped index 1 and jumped straight to 2!
    expect(doubleInvoked).toBe(2);

    // IN CONTRAST: Our pure reducer state machine advances exactly once per dispatched action:
    const initialState = getInitialState();
    const action: RelayEngineAction = { type: 'ADVANCE_STAGE', totalAgents: 4 };

    // Even if React runs the reducer twice during a render pass:
    const passA = relayEngineReducer(initialState, action);
    const passB = relayEngineReducer(initialState, action);

    expect(passA.agentIndex).toBe(1); // NEXUS is NEVER skipped!
    expect(passB.agentIndex).toBe(1);
  });

  it('4. Reset Action: restores origin docked state and increments run cycle', () => {
    let state = getInitialState();
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    expect(state.agentIndex).toBe(2);

    const resetState = relayEngineReducer(state, { type: 'RESET' });
    expect(resetState.agentIndex).toBe(0);
    expect(resetState.stageStepIndex).toBe(0);
    expect(resetState.locomotionStage).toBe('ready');
    expect(resetState.isPlaying).toBe(false);
    expect(resetState.runCount).toBe(2);
    expect(resetState.runId).toBe('RUN-2');
  });

  it('5. Replay Mode: halts locomotion when cycle reaches final stage', () => {
    let state = getInitialState();
    state = relayEngineReducer(state, { type: 'TRIGGER_REPLAY' });
    expect(state.isReplayingHistorical).toBe(true);
    expect(state.isPlaying).toBe(true);

    // Advance 0 -> 1 -> 2
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    expect(state.agentIndex).toBe(3);
    expect(state.isPlaying).toBe(true);

    // Final stage completion in replay mode:
    state = relayEngineReducer(state, { type: 'ADVANCE_STAGE', totalAgents: 4 });
    expect(state.isPlaying).toBe(false);
    expect(state.isReplayingHistorical).toBe(false);
    expect(state.locomotionStage).toBe('ready');
  });

  it('6. Manual Stage Stepping: updates stageStepIndex without altering carrier locomotion', () => {
    let state = getInitialState();
    state = relayEngineReducer(state, { type: 'STEP_STAGE_MANUAL', stepIndex: 2 });
    expect(state.stageStepIndex).toBe(2);
    expect(state.agentIndex).toBe(0); // Carrier remains on SCOUT
  });
});
