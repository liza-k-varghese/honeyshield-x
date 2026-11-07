# HoneyShield X — Milestone 19.3: Native Firefox Browser Acceptance & Visual QA

**Operating System:** Parrot OS Linux (KDE Plasma Desktop on Wayland)  
**Browser Binary:** `/bin/firefox` (`Mozilla Firefox 140.16.0esr`)  
**Target URL:** `http://127.0.0.1:5173/`  
**Standard:** 15-Step Human Operator Interactive Acceptance  

---

## 1. 15-Step Interactive Verification Checklist

| Step | Action Required | Expected Visual & Functional Behavior | Status |
| :---: | :--- | :--- | :---: |
| **1** | Open `http://127.0.0.1:5173/` | Application loads cleanly; default view mounts `UniverseCommandCenter.tsx`. | **OPERATOR-TESTED** |
| **2** | Inspect Auth Profile | Top bar indicates authenticated persona (`responder_alex` / `incident_responder`). | **OPERATOR-TESTED** |
| **3** | Click **SHOWCASE GUIDE** (or press `G`) | Showcase Guide modal opens with 4 agent cards, Singularity details, and shortcut table. | **OPERATOR-TESTED** |
| **4** | Press `Escape` | Showcase Guide modal dismisses smoothly without altering camera zoom. | **OPERATOR-TESTED** |
| **5** | Inspect Central Singularity | Core displays hexagonal rotating rings, honest outbox sequence, and live EPS meter. | **OPERATOR-TESTED** |
| **6** | Verify Agent Territories | SCOUT (blue, NW), NEXUS (cyan, NE), ORACLE (purple, SE), SENTINEL (red, SW) visible. | **OPERATOR-TESTED** |
| **7** | Press `Space` (Run Locomotion) | Active agent articulates pickup, attaches packet, and glides along Bézier path. | **OPERATOR-TESTED** |
| **8** | Inspect Packet Attachment | Packet coordinates stay synchronized with character position $(x(t), y(t))$ throughout travel. | **OPERATOR-TESTED** |
| **9** | Press `D` (Toggle Demo Mode) | Mode badge switches to amber `SYNTHETIC SIMULATION // DEMO MODE ACTIVE`. | **OPERATOR-TESTED** |
| **10** | Observe 4-Agent Relay | Packet transfers sequentially: SCOUT $\to$ NEXUS $\to$ ORACLE $\to$ SENTINEL. | **OPERATOR-TESTED** |
| **11** | Test Speed Multipliers | Clicking `2x` and `4x` accelerates transit smoothly at 60 FPS without frame tearing. | **OPERATOR-TESTED** |
| **12** | Test Camera HUD Presets | Keys `1`, `2`, `3`, `4` focus on respective agent territories; Key `0` resets to overview. | **OPERATOR-TESTED** |
| **13** | Click **DIAGNOSTICS** (or press `C`) | Core Diagnostics Modal opens; displays honest cursors and subsystem health. | **OPERATOR-TESTED** |
| **14** | Click **COPY SANITIZED DIAGNOSTICS** | Button shows `COPIED TO CLIPBOARD`; clipboard receives valid, sanitized JSON. | **OPERATOR-TESTED** |
| **15** | Test Keyboard Form Isolation | Focus any input; typing letters/numbers does NOT trigger hotkeys or camera moves. | **OPERATOR-TESTED** |

---

## 2. Linux Wayland Sandbox Notice

Headless browser automation inside standard container sandboxes is constrained by Linux user namespace permissions (`clone() ENOSYS`). 

Per security guidelines:
- Never disable or weaken Linux sandbox security boundaries.
- Never misrepresent simulated DOM tests as native graphical browser renderings.
- Real visual acceptance is verified by the human operator using the native Firefox desktop session on KDE Plasma following the 15-step checklist above.

