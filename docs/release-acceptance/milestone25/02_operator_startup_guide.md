# HoneyShield X — Milestone 25: Operator Startup Guide & Reliable Local Services

**Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 25 — Final Operator Witness & Release Sign-Off  

---

## 1. Zero-Friction Operator Acceptance Sequence

To allow an operator or evaluator to witness HoneyShield X without requiring deep architectural knowledge, the application follows a streamlined single-command launcher workflow:

```
[START APPLICATION]
        |
        v
    [SIGN IN] (Quick-Select: Responder Alex)
        |
        v
[INSPECT OVERVIEW] (Verify 3/3 Services & Dynamic Sensor Health)
        |
        v
[INVESTIGATE ALERT] (1-Click Handoff: RCE Exploit -> Forensics)
        |
        v
[REVIEW HONEYPOTS] (Canary Honeytokens & Trap Health)
        |
        v
[THREAT INTELLIGENCE] (Search APT29 IOC & Negative Match)
        |
        v
 [ENTER UNIVERSE] (Spatial Observatory & 4 Robotic Quadrants)
        |
        v
[RUN 4-AGENT RELAY] (Press Key 'D' -> Demo Mode Showcase)
        |
        v
[INSPECT REAL EVENT] (Press Key 'C' -> Core Diagnostics Modal)
        |
        v
[CAPTURE EVIDENCE] (Save Screenshot / Video Recording)
        |
        v
    [SIGN OUT] (Safe Session Destruction)
```

---

## 2. Verified Startup Procedure

### 2.1 Single-Command Demonstration Launcher
Execute the pre-built, non-destructive launcher:
```bash
cd /home/liza/HoneyShield-X
bash scripts/launch_universe_demo.sh
```
This script:
1. Validates project-local executables (`node`, `backend/.venv/bin/python3`, `./frontend/node_modules/.bin/vite`).
2. Checks socket availability on port 8000 and port 5173.
3. Automatically launches the FastAPI server and Vite dev server.
4. Traps SIGINT/SIGTERM to ensure clean process termination upon `Ctrl+C`.

### 2.2 Manual Process Launch (If Preferred)
```bash
# Terminal 1: FastAPI Backend
cd /home/liza/HoneyShield-X
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Vite Frontend Dev Server
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173
```

---

## 3. Subsystem Health & Zero-Crash Fallbacks

When external PostgreSQL (port 5432) or Redis (port 6379) daemons are inactive:
- **FastAPI Boot:** Does not crash; logs clean warning and engages in-memory store fallbacks.
- **SessionStore:** Operates in in-memory session cache mode.
- **EventBus:** Broadcasts over an in-memory pub/sub broker.
- **Database Operations:** Utilizes SQLite transactional engine with zero schema errors.
- **Frontend SPA:** Serves cleanly on `http://127.0.0.1:5173/`.

