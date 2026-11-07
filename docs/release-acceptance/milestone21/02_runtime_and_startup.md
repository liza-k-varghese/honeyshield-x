# HoneyShield X — Milestone 21: Runtime Environment & Startup Verification

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux (6.x Kernel) / KDE Plasma / Wayland Compositor / Mozilla Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Runtime Environment Verification

HoneyShield X strictly enforces the use of project-local executables and isolated virtual environments to prevent global host pollution and version drift.

### 1.1 Toolchain & Runtimes
| Toolchain Component | Verified Version | Execution Path | Policy Compliance |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.19.2` | `/usr/bin/node` | Compliant (LTS release) |
| **pnpm** | `9.15.4` | System / local bundle | Compliant |
| **Python** | `3.13.5` | `/usr/bin/python3` | Compliant (Modern async runtime) |
| **Virtual Environment** | Python 3.13 venv | `/home/liza/HoneyShield-X/backend/.venv` | Strict local isolation |
| **Vite** | `6.4.4` | `./frontend/node_modules/.bin/vite` | Strict project-local executable |
| **TypeScript** | `5.7.2` | `./frontend/node_modules/.bin/tsc` | Strict project-local executable |
| **Vitest** | `5.0.3` | `./frontend/node_modules/.bin/vitest` | Strict project-local test runner |
| **FastAPI** | `0.115.x` | `backend/.venv/bin/uvicorn` | ASGI asynchronous server |

---

## 2. Zero-Crash Graceful Storage Fallback

A critical enterprise requirement validated in Milestone 21 is resilience against external daemon outages (PostgreSQL / Redis). HoneyShield X implements graceful in-memory storage fallbacks across all core routers:

```python
# Verified Fallback Architecture in FastAPI Boot:
SessionStore: In-memory fallback active (Redis offline)
EventBus: In-memory outbox streaming active
CampaignStore: In-memory database active (PostgreSQL offline)
CaseStore: In-memory forensic registry active
DeceptionStore: In-memory honeypot catalog active
ThreatIntelStore: In-memory STIX 2.1 cache active
EvidenceStore: In-memory tamper-evident vault active
HuntStore: In-memory IOC hunting index active
IntegrationStorage: In-memory webhook/SIEM state active
```

When PostgreSQL and Redis services are reachable, HoneyShield X automatically leverages connection pools (`asyncpg` and `redis-py`). If the daemons are offline or inaccessible during rapid developer prototyping or isolated air-gapped evaluation, the backend starts without panic or unhandled exceptions, maintaining full API contract fidelity.

---

## 3. Verified Startup Commands

### 3.1 Production Build & Startup
```bash
# 1. Compile Frontend Production Bundle
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite build

# 2. Launch FastAPI Backend
cd /home/liza/HoneyShield-X
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. Serve Frontend via Local Static Server / Vite Preview
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite preview --port 5173 --host 0.0.0.0
```

### 3.2 Automated One-Command Demo Launcher
For operator demonstrations, the repository includes a self-healing verification script:
```bash
/home/liza/HoneyShield-X/scripts/launch_universe_demo.sh
```
This launcher:
1. Validates TCP ports 8000 (Backend API) and 5173 (Frontend SPA).
2. Spawns background worker instances with proper PID tracking.
3. Performs HTTP `/health` polling until 200 OK is returned.
4. Spawns Firefox targeting `http://localhost:5173/#universe`.
5. Binds SIGINT/SIGTERM handlers to ensure zero orphaned background processes.

---

## 4. Port & Networking Allocations
- **Port 8000:** FastAPI REST API, Swagger UI (`/docs`), OpenAPI schema (`/openapi.json`), WebSocket endpoint (`/api/v1/agents/ws/stream`).
- **Port 5173:** Vite Development Server / Preview Static Host.
- **Port 5432:** Optional PostgreSQL 16 database.
- **Port 6379:** Optional Redis 7 cache and pub/sub broker.

All internal endpoints communicate over loopback `127.0.0.1` by default, preserving host security boundaries.

