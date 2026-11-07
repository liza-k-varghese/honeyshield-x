# HoneyShield X — Milestone 19.3: One-Command Demonstration Startup Guide

**Project:** HoneyShield X — Spatial SOC Universe 2.0 Command Center  
**Target Environment:** Parrot OS Linux / KDE Plasma / Wayland / Mozilla Firefox 140.16.0esr  
**Primary Launcher:** `scripts/launch_universe_demo.sh`  
**Preflight Diagnostic:** `scripts/check_universe_demo.sh`  

---

## 1. Quickstart Demonstration Launcher

To launch the HoneyShield X Universe 2.0 demonstration environment in a single command on Parrot OS:

```bash
cd /home/liza/HoneyShield-X
./scripts/launch_universe_demo.sh
```

### What the Launcher Does:
1. **Resolves Project Root:** Anchor paths reliably to `/home/liza/HoneyShield-X`.
2. **Validates Runtimes:** Checks `node` (v20.19.2+) and Python 3.13 virtual environment (`backend/.venv`).
3. **Bypasses Global npm:** Invokes the proven project-local Vite binary directly (`frontend/node_modules/.bin/vite`).
4. **Inspects Ports & Services:**
   - Detects if FastAPI (port 8000) or Vite (port 5173) are already active; reuses healthy instances without port collisions.
   - If inactive, spawns background daemons and logs to `/tmp/honeyshield_api_demo.log` and `/tmp/honeyshield_vite_demo.log`.
5. **Checks Infrastructure Daemons:** Tests PostgreSQL 17 (port 5432) and Redis (port 6379), reporting in-memory zero-migration resilience if unconfigured.
6. **Graceful Cleanup Trap:** Pressing `Ctrl+C` terminates only the subprocesses launched during the session.

---

## 2. Preflight Diagnostics

Before demonstrating to stakeholders or operators, execute the read-only preflight check:

```bash
cd /home/liza/HoneyShield-X
./scripts/check_universe_demo.sh
```

### Preflight Verification Matrix:
- `Check 1/9`: Frontend & Static Bundle Integrity (`dist/index.html` and chunks verified).
- `Check 2/9`: Backend API Gateway (`/health` endpoint reachability).
- `Check 3/9`: Authentication & Operator Registry (seeded personas: `viewer_dan`, `analyst_sarah`, `responder_alex`, `admin_chief`).
- `Check 4/9`: PostgreSQL 17 Subsystem (connection check / fallback).
- `Check 5/9`: Redis Outbox Message Bus (connection check / fallback).
- `Check 6/9`: Outbox Schema & Sequence Model (`SecurityEventOutbox` columns).
- `Check 7/9`: Event Streaming Configuration (`/events/stream` and `/events/ws`).
- `Check 8/9`: Universe 2.0 Routes (`UniverseCommandCenter` mapped as default view).
- `Check 9/9`: Host Graphical Browser & Sandbox Boundaries.

---

## 3. Desktop Application Access URLs

Once launched, access the command center natively via Firefox:

| Endpoint | URL | Purpose |
| :--- | :--- | :--- |
| **Universe 2.0 Command Center** | `http://127.0.0.1:5173/` | Primary Flagship Interface (Spatial Map & Observatory) |
| **Interactive API Documentation** | `http://127.0.0.1:8000/docs` | Swagger UI for backend ingestion & outbox APIs |
| **API Health Endpoint** | `http://127.0.0.1:8000/health` | Sanitized Subsystem Health Check JSON |

