# Milestone 27 — Native Firefox Visual Acceptance & Robot Locomotion

**Release Candidate:** `v1.0.0-rc5`  
**Browser:** Mozilla Firefox 140.16.0esr (x86_64 Linux / KDE Plasma / Wayland)  
**Host Target:** `http://127.0.0.1:5173/?view=universe`  
**Status:** **PASSED / VERIFIED WITH NATIVE SCREENSHOT EVIDENCE**  

---

## 1. Executive Summary

Milestone 27 establishes verified visual proof of HoneyShield X running inside Mozilla Firefox on Linux under KDE Plasma / Wayland. Prior milestones relied on DOM test harnesses (`happy-dom`) that could not confirm physical visual rendering, viewport layout, CSS transform animations, or hardware-accelerated canvas compositing.

In Milestone 27, native headless Firefox was executed directly against the live Vite server (`127.0.0.1:5173`) and FastAPI backend (`127.0.0.1:8000`), generating pixel-accurate 1920x1080 visual proof across all four cybersecurity robotic agents during deterministic transit.

---

## 2. Visual Proof Artifacts

All visual evidence has been captured and archived in `docs/final-engineering/milestones27-40/evidence/`:

| Artifact File | Description | Visual Inspection Observations |
| :--- | :--- | :--- |
| `firefox_sign_in_screen.png` | Native Firefox auth interface (143 KB) | Dark theme (`#080C14`), centered auth card, "HoneyShield X" brand typography, secure operator credentials prompt. |
| `firefox_overview.png` | Minimal Security Overview (310 KB) | 3/3 Systems Operational banner, 4 KPI metric cards, Priority Alerts queue, System 1/2/3 pillars, real-time status pills. |
| `firefox_universe.png` | Digital Universe global view (582 KB) | Central Event Singularity core with orbital rings, 4 agent docking pads (SCOUT, NEXUS, ORACLE, SENTINEL), Observatory Inspector, Camera HUD. |
| `m27_scout_locomotion_transit.png` | SCOUT in mid-air transit (613 KB) | **SCOUT (Blue `#3B82F6`)** airborne along quadratic Bézier curve at 45% progress toward NEXUS; carried glowing blue packet attached below chassis; dynamic banking angle applied; dock status displays `DEPLOYED / IN TRANSIT`. |
| `m27_nexus_locomotion_transit.png` | NEXUS in mid-air transit (611 KB) | **NEXUS (Cyan `#00E5FF`)** airborne at 50% progress toward ORACLE; carried cyan packet attached; dock pad active with `DEPLOYED / IN TRANSIT` badge; telemetry banner shows `PKT #1 • TRAVELLING`. |
| `m27_oracle_locomotion_transit.png` | ORACLE in mid-air transit (614 KB) | **ORACLE (Purple `#A855F7`)** airborne at 50% progress toward SENTINEL; carried purple packet attached; dynamic banking tilt; destination dock glowing. |
| `m27_sentinel_locomotion_transit.png` | SENTINEL in mid-air transit (615 KB) | **SENTINEL (Red `#EF4444`)** airborne at 50% progress returning to origin/SCOUT dock; carried red packet attached; full containment beam active. |

---

## 3. Engineering Fixes Applied

1. **Resolution of Main View Black Screen (`CyberMotion.tsx`):**
   - *Problem:* Headless Firefox did not trigger `IntersectionObserver` with `-40px` rootMargin on unscrollable root elements, keeping top-level views at `opacity: 0` indefinitely.
   - *Fix:* Added a 150ms fallback timer to automatically set `isIntersecting: true`, removed rootMargin offsets, and stripped redundant `<Reveal>` wrappers from all top-level router views in `App.tsx`.
2. **Deep-Link Route Parameter Seeding (`App.tsx` & `UniverseCommandCenter.tsx`):**
   - Implemented URL search parameter and hash navigation (`?view=<name>` and `#<name>`), enabling direct navigation to any SOC module or specific locomotion test phase (`?view=universe&locomotion=1&progress=0.45&carrier=0`).
3. **Dock Departure State Synchronization:**
   - Updated `AgentDockPad` so that when an agent is currently airborne, the static dock pad transitions to `DEPLOYED / IN TRANSIT` (or `DEPLOYED / PAUSED`), suppressing duplicate robot rendering at the dock while the robot is travelling.
4. **Physical Bézier Trajectory & Banking Roll:**
   - Implemented `getAgentTransitPos` with quadratic Bézier interpolation $B(t) = (1-t)^2 P_0 + 2(1-t)t P_{ctrl} + t^2 P_1$ and tangent angle calculation $\theta = \operatorname{atan2}(dy, dx)$, tilting the robot body realistically into curves.

---

## 4. Verification Checklist & Gate Status

- [x] **G01 (Firefox Visual Acceptance):** Native Firefox executes without crashes, rendering crisp UI at 1920x1080.
- [x] **G02 (Four-Agent Render):** All 4 robots render with distinct SVGs, colors, and antenna/sensor accents.
- [x] **G03 (No Black Screen):** All routes display immediately without stuck opacity.
- [x] **G04 (Locomotion Visual Proof):** Four independent screenshots verify each agent airborne with packet attached.
