# HoneyShield X — Operator Quickstart & Browser Verification Runbook

**Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Platform URL:** `http://127.0.0.1:5173/`  
**API Health:** `http://127.0.0.1:8000/health`  

---

### Step 1: Start the Demonstration Environment

In a terminal on your host machine:
```bash
cd /home/liza/HoneyShield-X
./scripts/launch_universe_demo.sh
```
*Note: The launcher automatically checks for running services, reuses active ports on 5173 and 8000, and ensures clean cleanup upon pressing `Ctrl+C`.*

To run preflight diagnostics without launching services:
```bash
./scripts/check_universe_demo.sh
```

---

### Step 2: Open Firefox & Sign In

1. Open **Mozilla Firefox** on your KDE Plasma desktop.
2. Navigate to: **`http://127.0.0.1:5173/`**
3. At the login portal, sign in using one of the seeded operator accounts:
   - **Username:** `responder_alex`
   - **Password:** `HoneyShield2026!Secure` (or any configured operator credentials)
4. Click **`ENTER UNIVERSE COMMAND CENTER`** on the navigation bar.

---

### Step 3: Interactive Universe 2.0 Inspection Checklist

Once the Universe Command Center loads:

- [ ] **Cosmic Observatory:** Verify the procedural particle starfield and orbital conduits render smoothly.
- [ ] **Robotic Characters:** Verify the 4 distinct characters in their respective quadrants:
  - **SCOUT** (Top-Left, Blue) — Sensor collection
  - **NEXUS** (Top-Right, Cyan) — Ingestion & outbox courier
  - **ORACLE** (Bottom-Left, Purple) — Threat intelligence analyst
  - **SENTINEL** (Bottom-Right, Red) — SOC containment response
- [ ] **Event Singularity Core:** Inspect the central core displaying operational status (`CONNECTED` or `STANDBY`).
- [ ] **Showcase Guide Modal:** Press **`G`** (or click **`SHOWCASE GUIDE`**) to open the tour overlay. Press **`Escape`** to dismiss.
- [ ] **Camera Controls:** Press **`1`**, **`2`**, **`3`**, **`4`** to focus each quadrant; press **`0`** to reset to overview.
- [ ] **Locomotion:** Press **`Space`** to pause / resume courier locomotion along the curved Bézier path.
- [ ] **Demo Mode Relay:** Press **`D`** (or click **`SIMULATE DEMO`**) to watch the 4-agent sequential handoff relay.
- [ ] **Core Diagnostics:** Press **`C`** (or click **`DIAGNOSTICS`**) to open the 12-tile operational audit panel.
- [ ] **Copy Diagnostics:** Click **`COPY SANITIZED DIAGNOSTICS`** and verify the button changes to `COPIED TO CLIPBOARD` without leaking tokens.

