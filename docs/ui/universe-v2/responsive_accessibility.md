# HoneyShield X — Responsive Layout & Accessibility Acceptance

## 1. Responsive Layout Breakpoints

- **Desktop (1920px & 1440px):** Large orbital stage (590px height) with full concentric rings, camera navigation HUD, and adjacent 4-column Observatory Agent Inspector.
- **Tablet (1024px & 768px):** Proportional stage scaling (500px height), orbital rings adjust, inspector docks cleanly beneath stage without horizontal scrolling.
- **Mobile (430px & 390px):** Optimized spatial composition (440px stage), touch-friendly territory cards ($\ge 44\text{px}$ touch targets), compact camera controls, zero label collisions or clipping.

## 2. Accessibility & WCAG 2.1 AA Compliance

1. **Reduced Motion (`prefers-reduced-motion`):**
   - Disables rapid orbital ring rotations, radar sweeps, barrier pulses, and camera transitions via `usePrefersReducedMotion`.
   - Substitutes instantaneous, clean state changes to prevent motion sickness.
2. **Keyboard Navigation & Hotkeys:**
   - `0` / `Escape`: Reset Camera to Global Overview
   - `1`: Focus SCOUT Sensor Frontier
   - `2`: Focus NEXUS Processing Nexus
   - `3`: Focus ORACLE Intelligence Sanctum
   - `4`: Focus SENTINEL Response Bastion
   - `C` / `5`: Focus Event Singularity & Core Diagnostics
   - `D`: Toggle Synthetic DEMO Mode
   - `R`: Trigger Event Journey Replay
   - `Space`: Run / Pause Physical Locomotion
3. **Semantic Text Alternatives:**
   - All critical telemetry (threat scores, attack counts, alerts, outbox cursors) is displayed in clear text alongside graphic representations.

