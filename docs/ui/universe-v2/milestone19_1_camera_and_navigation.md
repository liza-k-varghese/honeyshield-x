# HoneyShield X — Milestone 19.1: Camera Engine & Navigation

## 1. Spatial Perspective Camera

The stage utilizes CSS perspective transforms on `.hsx-spatial-world`:

- `camera-overview`: `scale(1) translate(0%, 0%)`
- `camera-singularity`: `scale(1.35) translate(0%, 0%)`
- `camera-scout`: `scale(1.3) translate(18%, 18%)`
- `camera-nexus`: `scale(1.3) translate(-18%, 18%)`
- `camera-oracle`: `scale(1.3) translate(-18%, -18%)`
- `camera-sentinel`: `scale(1.3) translate(18%, -18%)`

## 2. Input Isolation & Keyboard Hotkeys

### Input Field Protection:
The global keyboard listener inspects `e.target`. If the user is typing inside an `<input>`, `<textarea>`, `[contenteditable="true"]`, or `[role="textbox"]`, hotkeys are immediately bypassed to prevent text entry collisions.

### Priority Handling on Escape:
If the Holographic Core Diagnostics modal is open, pressing `Escape` closes the modal first without unexpectedly snapping the camera back to global overview.

### Verified Keyboard Mappings:
- `0`: Reset Camera to Global Overview
- `1`: Focus SCOUT Sensor Frontier
- `2`: Focus NEXUS Processing Nexus
- `3`: Focus ORACLE Intelligence Sanctum
- `4`: Focus SENTINEL Response Bastion
- `C` / `5`: Focus Event Singularity & Open Core Diagnostics
- `D`: Toggle Synthetic DEMO Mode
- `R`: Trigger Historical Event Replay
- `Space`: Run / Pause Physical Locomotion
- `Escape`: Modal Dismissal / Overview Reset

