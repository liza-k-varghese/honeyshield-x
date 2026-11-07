# HoneyShield X — Milestone 19.2: Operator-Assisted Firefox Acceptance Runbook

**Target Browser:** Mozilla Firefox 140.16.0esr (Parrot OS Linux / KDE Plasma / Wayland)  
**Host Application Endpoint:** `http://127.0.0.1:5173/`  
**Target View:** Spatial SOC Universe 2.0 Command Center  

---

## 1. Startup & Execution Instructions

### Step 1: Verify the Frontend Dev Server
In the host desktop terminal, execute:
```bash
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173
```
*Note: The Vite server should confirm readiness with `Local: http://127.0.0.1:5173/`.*

### Step 2: Launch Native Firefox
Open Mozilla Firefox on your KDE Plasma desktop and navigate to:
```
http://127.0.0.1:5173/
```

---

## 2. Interactive Acceptance Checklist

Execute the following sequential operations and record the visual observations:

### Check 1: Living Observatory & Event Singularity
- [ ] Observe the obsidian starfield canvas with subtle animated twinkling nodes.
- [ ] Observe the central **Event Singularity** core at $(600, 420)$ with glowing hexagonal containment rings and active EPS / Event count indicators.
- [ ] Verify the Singularity status badge displays an honest state (`CONNECTED`, `PROCESSING`, `DEGRADED`, `DISCONNECTED`, `REPLAY`, or `DEMO`).

### Check 2: Four Robotic Agent Quadrants
- [ ] **Top-Left (SCOUT):** Blue aerostat with rotating radar beam and pulse indicator.
- [ ] **Top-Right (NEXUS):** Cyan neural biped with orbital data rings.
- [ ] **Bottom-Right (ORACLE):** Purple prism with floating runic threat glyphs.
- [ ] **Bottom-Left (SENTINEL):** Red heavy combat walker with dual containment barrier shields.

### Check 3: Physical Locomotion & Packet Carriage
- [ ] Click the **RUN LOCOMOTION** button (or press `Space`).
- [ ] Verify the character approaches the data packet, articulates pickup arms, attaches the glowing packet, and traverses the curved Quadratic Bézier conduit without teleporting or lagging.
- [ ] Verify the packet color dynamically shifts to match the transporting agent (Blue $\to$ Cyan $\to$ Purple $\to$ Red).
- [ ] Verify the transit enters a brief `'waiting'` phase before handoff confirmation.

### Check 4: Four-Agent Demo Mode Relay
- [ ] Click **SIMULATE DEMO** in the top bar (or press `D`).
- [ ] Observe the full 4-agent cascade:
  1. SCOUT captures honeypot telemetry $\to$ hands off to NEXUS.
  2. NEXUS normalizes and registers into outbox $\to$ hands off to ORACLE.
  3. ORACLE cross-references threat intelligence $\to$ hands off to SENTINEL.
  4. SENTINEL generates confirmed alert and activates containment forcefield.
- [ ] Verify the top mode badge transitions to `SYNTHETIC SIMULATION // DEMO MODE ACTIVE` in amber.

### Check 5: Operator Validation Diagnostics & Copy Function
- [ ] Click the **DIAGNOSTICS** button in the top coordination bar (or click the central Event Singularity core, or press `C`).
- [ ] Confirm the **Holographic Core Diagnostics Modal** opens.
- [ ] Inspect the **OPERATOR VALIDATION & TELEMETRY AUDIT** panel:
  - Build Version: `v1.0.0-rc5`
  - Operating Mode: `DEMO SIMULATION` or `LIVE STREAM`
  - WS Stream State: `connected` or `disconnected`
  - Last Stream Cursor: honest cursor (e.g. `#104`, `#DEMO-104`, or `SYNCED`), never fake `#304`.
  - Subsystem Health: PostgreSQL and Redis show truthful statuses (`CONNECTED`, `DISCONNECTED`, or `UNKNOWN`).
- [ ] Click **COPY SANITIZED DIAGNOSTICS**.
- [ ] Verify the button provides visual feedback: `COPIED TO CLIPBOARD` with a green checkmark.
- [ ] Paste into a text editor to confirm the sanitized JSON payload is formatted cleanly without leaking credentials or tokens.

### Check 6: Keyboard Hotkey Isolation
- [ ] Click inside any text input, search box, or textarea.
- [ ] Type keys `0`, `1`, `2`, `3`, `4`, `c`, `r`, ` ` (Space).
- [ ] Verify that letters and numbers appear in the input without triggering camera moves, opening modals, or altering simulation playback.
- [ ] Open the Diagnostics Modal and press `Escape`. Verify that only the modal closes, leaving camera zoom and focus untouched.

---

## 3. Evidence Capture Guidelines

When capturing verification screenshots using Spectacle or KDE Plasma screenshot tools:
1. Save the captured overview image to:
   `docs/ui/universe-v2/evidence/firefox_desktop_acceptance.png`
2. Save modal diagnostics screenshot to:
   `docs/ui/universe-v2/evidence/firefox_diagnostics_modal.png`

