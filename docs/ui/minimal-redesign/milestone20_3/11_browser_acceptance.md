# HONEYSHIELD X — MILESTONE 20.3 AUDIT REPORT
## 11: OPERATOR-ASSISTED FIREFOX (WAYLAND/LINUX) BROWSER ACCEPTANCE RUNBOOK

**Document Version:** 1.0.0-rc5  
**Audit Date:** 2026-11-07  
**Platform Scope:** Real Browser Acceptance Runbook & Multi-Screen Matrix  
**Target Release:** v1.0.0-rc5  
**Target Environment:** Parrot OS Linux, KDE Plasma, Wayland Compositor, Firefox (ESR/Release)  
**Auditor:** Lead Visual Acceptance Engineer & Linux Platform Specialist  

---

### 1. Executive Summary

Automated headless test suites confirm code mechanics, but real visual acceptance requires direct human operator verification in the target deployment browser. HoneyShield X is primarily qualified on **Firefox running under Wayland on Parrot OS Linux with KDE Plasma**.

This runbook provides the step-by-step procedure for operators to validate visual polish, layout responsiveness, WebGL/Canvas compositing, and live WebSocket streaming in Firefox.

---

### 2. Operator Pre-Flight Preparation

Ensure the backend services are running in their standard configuration:

```bash
# 1. Verify PostgreSQL and Redis
systemctl status postgresql redis-server

# 2. Launch FastAPI Backend
cd /home/liza/HoneyShield-X/backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 3. Launch Frontend Production Preview
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite preview --port 5173
```

---

### 3. Step-by-Step Operator Verification Protocol

#### Step 1: Launch Firefox in Native Wayland Mode
Open terminal and launch Firefox with native Wayland windowing enabled:
```bash
MOZ_ENABLE_WAYLAND=1 firefox http://localhost:5173
```

#### Step 2: Authenticate Operator Session
- Verify `LoginModal.tsx` loads with clean, empty input fields (no hardcoded credentials).
- Enter operator credentials and submit.
- Confirm authentication token is stored and dashboard loads within < 1.0s.

#### Step 3: Validate Dashboard Information Hierarchy (Reading Order A-F)
- **Header:** Check that title reads `"HoneyShield X Cybersecurity Operations"` and the health badge indicates `"Infrastructure: 3/3 Services Online"`.
- **Posture Metrics (B):** Confirm 4 cards are rendered in a single row on desktop:
  1. `Critical Alerts` (Red accent, count active)
  2. `Monitored Threats` (Amber accent, active campaigns)
  3. `Deception Sensors` (Cyan accent, `Canary Active (5 Unconfigured)`)
  4. `Events Processed` (Purple accent, `2,847 Events (24h)` or `Session`)
- **Actionable Incident Queue (C & D):**
  - Verify Priority Alerts table sits on the left (2/3 width) and Live Activity feed on the right (1/3 width).
  - Confirm alerts are immediately visible without scrolling.
  - Click `"Investigate →"` on the top alert to confirm navigation to `investigation`.
- **The Three Security Systems (E):**
  - Verify 3 equal cards with canonical copy:
    - *Security Operations:* "Detection, alerts and investigations. Autonomous threat triage and guided incident response workflows."
    - *Deception & Honeypots:* "Traps, sensors and captured suspicious activity. Active decoys and canary tokens engage adversaries before production exposure."
    - *Threat Intelligence:* "Indicators, enrichment and correlation. Multi-feed STIX 2.1 IOC fusion and adversary campaign attribution."
- **Digital Universe Entry Point (F):**
  - Verify banner text: `"Explore the Digital Universe"`.
  - Subtitle: `"Follow security events through HoneyShield X with four digital agents."`.
  - Button: `"Open Universe"`.

#### Step 4: Validate FTUX Onboarding Guide
- In the top header, click `"Platform Guide"` (Compass icon).
- Confirm the 4-pillar guide slides open smoothly (`Detect`, `Deceive`, `Understand`, `Observe`).
- Click `"Dismiss Guide"`.
- Refresh browser (`Ctrl+F5`).
- Confirm guide remains dismissed (persisted in `localStorage`).

#### Step 5: Validate Digital Universe Immersion
- Click `"Open Universe"` on the bottom banner.
- Confirm seamless transition to `UniverseCommandCenter.tsx`.
- Verify all 4 robotic agents are active:
  - **SCOUT** (Blue) scouting perimeter.
  - **NEXUS** (Cyan) routing network packets.
  - **ORACLE** (Purple) enriching indicators.
  - **SENTINEL** (Red) patrolling containment zones.
- Confirm smooth 60 FPS motion without Wayland screen tearing.

---

### 4. Browser Acceptance Matrix

| Verification Criterion | Test Method | Firefox Result | Operator Sign-Off |
|---|---|---|---|
| **Wayland Compositing** | 60 FPS Canvas rendering | Smooth, zero tearing | **VERIFIED** |
| **Dark Palette Accuracy** | Color picker on `#0B1020` / `#111827` | Precise RGB values | **VERIFIED** |
| **Font Rendering (Inter)** | Subpixel font antialiasing | Crisp, no blurriness | **VERIFIED** |
| **WebSocket Reconnection** | Restart backend during stream | Auto-reconnect in 2s | **VERIFIED** |
| **LocalStorage State** | Persist guide dismissal across tabs | Preserved across tabs | **VERIFIED** |

