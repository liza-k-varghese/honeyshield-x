# HoneyShield X — Milestone 52 Engineering Deliverable
## 01: Root Cause Analysis — Four-Robot Movement Diagnostics & Investigation

**Document Version:** 1.0.0  
**Status:** Completed & Empirically Verified  
**Environment:** Parrot OS Linux / KDE Plasma / Wayland Compositor / Mozilla Firefox 140.16.0esr  
**Release Candidate:** `v1.0.0-rc5`  
**Date:** 2026-11-08  

---

## 1. Executive Summary & Operator Observation

The operator reported the following observation during interactive native browser usage:
> *"The human operator has successfully started HoneyShield X, authenticated in Firefox, opened Security Overview, opened Digital Universe, seen all four robotic agents, started the robot relay.*  
> **New operator observation: Some robots move, but others remain stationary.**"

### 1.1 Directive Under Milestone 52
Milestone 52 explicitly instructed the engineering team:
> *"First determine whether the stationary robots are simply waiting for their turns or whether they never move during the complete relay."*

Through rigorous code inspection, browser console instrumentation, and native Firefox Marionette telemetry, the engineering team uncovered **two interconnected root causes**:
1. **Primary Critical Defect:** A re-entrant React 19 state update glitch inside `requestAnimationFrame` that completely skipped **NEXUS** (Leg 2) and **SENTINEL** (Leg 4) during continuous playback.
2. **Secondary Ergonomic Ambiguity:** A lack of explicit queue/standby status indicators on the stationary robot docks while an active carrier was traversing the canvas, giving an observer the false impression that non-moving robots were broken rather than awaiting their turn in the sequential pipeline.

---

## 2. Forensic Investigation of the Primary Defect

### 2.1 The React 19 State Setter Re-entrancy Bug
In `frontend/src/components/UniverseCommandCenter.tsx`, the locomotion animation loop was declared as:

```tsx
// PRE-FIX IMPLEMENTATION (UniverseCommandCenter.tsx lines 380-422)
const animateLocomotion = useCallback(
  (timestamp: number) => {
    ...
    setLocomotionProgress((prevProgress) => {
      const nextProgress = prevProgress + deltaTime * speedMultiplier;
      ...
      if (nextProgress >= 1.0) {
        // Leg Complete: Advance Relay
        setLocomotionStage('confirmed');
        setRelayAgentIndex((prevIdx) => (prevIdx + 1) % relayChain.length); // <-- SIDE EFFECT INSIDE UPDATER
        setActiveStageStepIndex((prev) => (prev + 1) % 4);                  // <-- SIDE EFFECT INSIDE UPDATER
        return 0.0;
      }
      return nextProgress;
    });
  },
  [locomotionSpeed, isLocomotionPlaying, isReplayingHistorical, relayAgentIndex, relayChain.length]
);
```

### 2.2 Mechanism of Failure
1. In React 19 under development and Strict Mode (and concurrent update batching), state updater callbacks passed to `setState((prev) => ...)` are executed **twice** to verify purity.
2. Because `setRelayAgentIndex((prevIdx) => (prevIdx + 1) % 4)` was invoked *inside* the updater callback of `setLocomotionProgress`, React's double invocation caused `setRelayAgentIndex` to be called **twice in a single animation completion frame**:
   - $\text{Leg } 0 \text{ completion}: 0 + 1 = 1 \xrightarrow{\text{2nd invocation}} 1 + 1 = 2$ (**Jumps from SCOUT directly to ORACLE, skipping NEXUS!**)
   - $\text{Leg } 2 \text{ completion}: 2 + 1 = 3 \xrightarrow{\text{2nd invocation}} 3 + 1 = 0$ (**Jumps from ORACLE directly to SCOUT, skipping SENTINEL!**)
3. Empirical confirmation was recorded via headless Firefox Marionette telemetry (`verify_m52_firefox_relay.py`), which proved that only **SCOUT (0)** and **ORACLE (2)** were ever dispatched, while **NEXUS (1)** and **SENTINEL (3)** were 100% stationary throughout the continuous relay!

```
BEFORE REPAIR — REAL FIREFOX OBSERVATION SUMMARY:
Total Observed Carriers: 2 / 4
  ✓ SCOUT     : 23 frames in transit
  ✗ NEXUS     : 0 frames (SKIPPED / REMAINED STATIONARY)
  ✓ ORACLE    : 18 frames in transit
  ✗ SENTINEL  : 0 frames (SKIPPED / REMAINED STATIONARY)
```

The human operator's observation was **100% physically accurate**. NEXUS and SENTINEL were truly never moving during the continuous relay.

---

## 3. Secondary Defect: Manual Step Forward (+15%) Stalling

In the bottom VCR control strip, the Step Forward button implementation contained a related state stalling defect:

```tsx
// PRE-FIX IMPLEMENTATION
<button
  onClick={() => {
    setLocomotionProgress((prev) => {
      const next = prev + 0.15;
      if (next >= 1.0) {
        setRelayAgentIndex((p) => (p + 1) % relayChain.length);
        return 0.0;
      }
      return next;
    });
  }}
>
```

When an operator manually stepped through a leg, advancing past 100% reset `locomotionProgress` to `0.0`. However:
1. `isAnyLocomotionActive` was defined as `isLocomotionPlaying || locomotionProgress > 0`.
2. When stepping manually with `isLocomotionPlaying = false`, reaching `0.0` caused `isAnyLocomotionActive` to evaluate to `false`.
3. Consequently, the travelling agent container unmounted, the next robot did not appear deployed, and the operator had to click Step Forward a second time before the next robot even showed up on screen.
4. `locomotionStage` was never updated during manual stepping, leaving the stage badge permanently stale.

---

## 4. Ergonomic Ambiguity: Lack of Turn Standby State on Docks

Even during the periods where SCOUT was in transit:
1. SCOUT's dock pad correctly displayed `DEPLOYED / IN TRANSIT`.
2. However, NEXUS, ORACLE, and SENTINEL docks displayed static badges with no mention of their queue position or turn status.
3. To any operator who expected a multi-robot concurrent patrol, seeing 3 stationary robots during SCOUT's 3.2-second transit conveyed the impression that the other 3 robots were inactive or unresponsive.

---

## 5. Root Cause Resolution Matrix

| Issue ID | Identified Defect | Root Cause | Engineering Solution |
|---|---|---|---|
| **RC-01** | NEXUS & SENTINEL skipped during continuous relay | Side-effect `setState` invocations inside `setLocomotionProgress` updater triggering React 19 double-increment ($0 \to 2 \to 0$) | Decoupled progress tracking into `progressRef.current`. Invoked `setRelayAgentIndex` at the top-level `rAF` callback outside updater functions. |
| **RC-02** | Manual Step Forward (+15%) stalls at leg handoff | Resetting `locomotionProgress` to `0.0` when paused caused `isAnyLocomotionActive` to evaluate to `false`, hiding carrier | Initialized handoff progress at `0.05` upon wrap-around and updated `locomotionStage` synchronously. |
| **RC-03** | Operator confusion regarding stationary robots | Stationary robots showed identical visual states regardless of whether relay was active or idle | Added dynamic `STANDBY [LEG X/4]` badges and queue status text (`Standby • Leg X/4`) on all non-carrier docks while relay is active. |
| **RC-04** | Lack of runtime visibility into relay state | No developer HUD overlay existed to monitor real-time mathematical coordinates and handoffs | Implemented collapsible Developer Diagnostics HUD (toggleable via `H` key, `DEV HUD` button, or `?debug=1`). |

---

## 6. Verification Summary

Following the application of the above fixes, native Firefox 140.16.0esr testing confirmed:
- **SCOUT (Leg 1/4):** 10 frames in continuous transit.
- **NEXUS (Leg 2/4):** 9 frames in continuous transit.
- **ORACLE (Leg 3/4):** 9 frames in continuous transit.
- **SENTINEL (Leg 4/4):** 10 frames in continuous transit.
- **Relay Loop:** Successfully cycles from SENTINEL back to SCOUT seamlessly.
