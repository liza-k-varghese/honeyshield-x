# HoneyShield X — Milestone 19.4: Safe Startup & Environment Verification
## Milestone 19.4 + RC5 Final Acceptance

**Launcher Script:** `scripts/launch_universe_demo.sh`  
**Preflight Utility:** `scripts/check_universe_demo.sh`  
**Frontend Service:** `http://127.0.0.1:5173/`  
**Backend API Service:** `http://127.0.0.1:8000/`  

---

### 1. Verification of Demonstration Scripts

The safe startup scripts delivered in Milestone 19.3 were inspected, verified, and re-tested:

#### `scripts/launch_universe_demo.sh`
- **Root Resolution:** Automatically computes repository root `cd "$(dirname "${BASH_SOURCE[0]}")/.."`.
- **Runtime Validation:** Detects Node.js (`v20+`) and project-local Vite (`frontend/node_modules/.bin/vite`).
- **Python Environment:** Locates `backend/.venv/bin/python3` and `uvicorn`.
- **Port Collision Protection:** Checks if ports 5173 or 8000 are already occupied; reuses healthy active instances instead of aborting or restarting ungracefully.
- **Graceful Termination:** Registers a bash `trap cleanup SIGINT SIGTERM EXIT` to guarantee all spawned background processes are terminated cleanly on exit.

#### `scripts/check_universe_demo.sh`
Evaluates the full stack across 9 independent, non-destructive criteria:
1. Frontend static bundle integrity (`dist/index.html` size: 991 bytes, valid CSS/JS assets).
2. Backend API gateway reachability (`/health`).
3. Operator authentication registry (4 seeded personas: `viewer_dan`, `analyst_sarah`, `responder_alex`, `admin_chief`).
4. Database subsystem: Verifies zero-migration in-memory fallback when PostgreSQL daemon is unconfigured.
5. Redis message bus: Verifies in-memory fallback when Redis is unconfigured.
6. Outbox schema: Verifies `SecurityEventOutbox` columns (`id`, `event_id`, `event_type`, `resource_id`, `severity`, `schema_version`, `payload_json`, `correlation_id`, `created_at`).
7. Real-time streaming endpoints (`/events/ticket`, `/events/ws`, `/events/replay`, `/events/stream`, `/events/lifecycle`).
8. Universe route mapping in `frontend/src/App.tsx`.
9. Host graphical Firefox environment and Wayland container boundary notification.

---

### 2. Preflight Execution Results

```text
======================================================================
HoneyShield X — Preflight Demonstration Diagnostics (Milestone 19.3/19.4)
Evaluation Mode: Read-Only Audit | Standard: Telemetry Honesty
======================================================================
[Check 1/9] Frontend Application & Static Bundle Integrity:    [ READY ]
[Check 2/9] Backend API Gateway & Health Endpoint:             [ STANDBY / DEV MODE ]
[Check 3/9] Authentication & Operator Registry:                [ READY ] (4 Personas)
[Check 4/9] Database Subsystem (PostgreSQL 17):                [ IN-MEMORY FALLBACK ]
[Check 5/9] Redis Outbox Message Bus:                          [ IN-MEMORY FALLBACK ]
[Check 6/9] Outbox Schema & Sequence Model:                    [ READY ] (9 Columns)
[Check 7/9] Event Streaming Configuration:                     [ READY ] (7 Endpoints)
[Check 8/9] Universe 2.0 Frontend Routes:                      [ READY ] (App.tsx Flagship)
[Check 9/9] Host Graphical Browser & Sandbox Execution Policy: [ READY ] (/bin/firefox)
======================================================================
PREFLIGHT DIAGNOSTICS COMPLETED — PLATFORM READY FOR DEMONSTRATION
======================================================================
Exit Code: 0
```

---

### 3. Safe Operator Launch Command

To launch the platform for demonstration and acceptance:
```bash
./scripts/launch_universe_demo.sh
```
Or to run preflight health checks without launching processes:
```bash
./scripts/check_universe_demo.sh
```

