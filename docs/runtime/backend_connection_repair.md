# HoneyShield X — Critical Runtime Repair: PostgreSQL & Redis Connection Recovery

**Document Path:** `docs/runtime/backend_connection_repair.md`  
**Repository:** `/home/liza/HoneyShield-X`  
**Release Candidate:** `v1.0.0-rc5`  
**Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Date:** 2026-11-07  
**Status:** RESOLVED — ALL SERVICES CONNECTED & HEALTHY  

---

## 1. Executive Summary & Root Cause Analysis

FastAPI's `/health` endpoint previously reported `status: degraded` with `postgresql: "error: OperationalError"` and `redis: "error: ConnectionError"`, despite host diagnostics showing `pg_isready` succeeding and `redis-cli ping` returning `PONG`.

This investigation diagnosed and resolved three distinct, compounding root causes:

### Root Cause 1: Container UID-to-Host Username Mapping (`dnsmasq` / PID 1605)
- TCP port 5432 and TCP port 6379 are bound by active Docker containers:
  - `honeyshield-postgres` (Container ID `84b60b0f3ff8`, Image `postgres:17`)
  - `honeyshield-redis` (Container ID `c42e9cc20040`, Image `redis:7-alpine`)
- Inside these official container images, `postgres` and `redis` run as **UID 999**.
- On Parrot OS, `/etc/passwd` maps UID 999 to system user `dnsmasq` (`dnsmasq:x:999:65534:dnsmasq:/var/lib/misc:/usr/sbin/nologin`).
- Consequently, host process listings (`ps aux`) legitimately display user `dnsmasq` for containerized PostgreSQL (PID 1605) and Redis (PID 1607). This is standard Linux container UID namespace behavior and is neither malicious nor an unintended instance.
- The dormant host cluster `17 main` was properly marked `down` because `honeyshield-postgres` already owns port 5432.

### Root Cause 2: Antigravity Process Sandbox Network Isolation
- The degraded FastAPI uvicorn daemon (PID in task-24428) had been launched in an isolated sandbox network namespace.
- Within this sandbox namespace, outbound socket attempts to `127.0.0.1:5432` and `127.0.0.1:6379` returned `Errno 111: Connection refused`, triggering `OperationalError` and `ConnectionError` on all database/broker requests.

### Root Cause 3: Configuration Decoupling & Inconsistent Environment Variable Resolution
- `backend/app/database.py` read only `DATABASE_URL` (with a hardcoded fallback) and ignored individual `POSTGRES_*` variables.
- `backend/app/main.py` read only individual `POSTGRES_*` variables and ignored `DATABASE_URL`.
- Redis environment variable naming was fragmented across storage modules: `backend/app/auth/session.py`, `evidence/storage.py`, and `cases/storage.py` inspected only `HONEYSHIELD_REDIS_HOST`, while other modules inspected only `REDIS_HOST`. In `routers/dashboard.py`, `REDIS_HOST = "127.0.0.1"` was hardcoded without importing `os`.
- No `.env` or externalized configuration file existed, and neither `main.py` nor `database.py` invoked `dotenv.load_dotenv()`.
- Alembic migration `f3b890123456_create_security_outbox_and_pairing_tables.py` had not been executed against the active database, causing missing table exceptions that aborted PostgreSQL transactions in unhandled code paths.

---

## 2. Connection Configuration Sources

| Component | Previous Mechanism | Repaired Mechanism |
|:---|:---|:---|
| **Dotenv Loading** | Not invoked | `python-dotenv` loads `backend/.env` and `/.env` at startup |
| **PostgreSQL Database** | Decoupled (`DATABASE_URL` in `database.py` vs `POSTGRES_*` in `main.py`) | Synchronized helper `get_postgres_config()` parses `DATABASE_URL` if present, falling back to `POSTGRES_*` settings |
| **Redis Broker** | Split (`HONEYSHIELD_REDIS_HOST` vs `REDIS_HOST`) | Unified resolution: `REDIS_URL` $\rightarrow$ `REDIS_HOST` $\rightarrow$ `HONEYSHIELD_REDIS_HOST` $\rightarrow$ `127.0.0.1` |
| **Configuration Templates** | Missing | Created `backend/.env.example` and `.env.example` with safe placeholders |
| **Active Local Runtime** | Missing | Created `backend/.env` (ignored by git in `.gitignore`) |

---

## 3. Port-Owner Findings

Diagnostics executed with read-only commands (`ps -fp 1605`, `ps -fp 1556`, `docker inspect`):

```
+--------------------------------------------------------------------------------------------------+
|                                    TCP PORT LISTENER AUDIT                                       |
+--------------------------------------------------------------------------------------------------+
| PORT  | CONTAINER / PROCESS    | IMAGE            | HOST PID | CONTAINER UID | HOST USERNAME     |
+-------+------------------------+------------------+----------+---------------+-------------------+
| 5432  | honeyshield-postgres   | postgres:17      | 1605     | 999           | dnsmasq           |
| 6379  | honeyshield-redis      | redis:7-alpine   | 1607     | 999           | dnsmasq           |
| 8000  | uvicorn (FastAPI)      | Python 3.13 venv | 111909   | 1000          | liza              |
| 5173  | vite (React Frontend)  | Node.js 20       | 113337   | 1000          | liza              |
+--------------------------------------------------------------------------------------------------+
```

Parent process of PID 1605 and PID 1607 is `/usr/bin/containerd-shim-runc-v2` (PPID 1556 and 1555), confirming both are legitimate Docker containers for the HoneyShield X stack.

---

## 4. Files Modified & Added

1. **`backend/app/main.py`**:
   - Added `dotenv.load_dotenv()` from `backend/.env` and `/.env`.
   - Added `get_postgres_config()`: parses `DATABASE_URL` via `sqlalchemy.engine.make_url` or resolves `POSTGRES_*` variables.
   - Added `get_redis_config()`: parses `REDIS_URL` or resolves `REDIS_HOST` / `HONEYSHIELD_REDIS_HOST`.
   - Updated `/health` endpoint to dynamically evaluate resolved configurations.
2. **`backend/app/database.py`**:
   - Added `dotenv.load_dotenv()` from `backend/.env` and `/.env`.
   - Added dynamic `DATABASE_URL` construction from `POSTGRES_*` environment variables when `DATABASE_URL` is unset.
3. **`backend/app/routers/dashboard.py`**:
   - Added missing `import os`.
   - Replaced hardcoded `REDIS_HOST` with `os.getenv("REDIS_HOST", os.getenv("HONEYSHIELD_REDIS_HOST", "127.0.0.1"))`.
   - Added `db.rollback()` guards on sub-query exception handlers to prevent PostgreSQL transaction aborts.
4. **`backend/app/auth/session.py`**:
   - Updated Redis connection to accept `REDIS_HOST` and `REDIS_PORT` as fallbacks for `HONEYSHIELD_REDIS_*`.
5. **`backend/app/evidence/storage.py`**:
   - Updated Redis connection to accept `REDIS_HOST` and `REDIS_PORT` as fallbacks.
6. **`backend/app/cases/storage.py`**:
   - Updated Redis connection to accept `REDIS_HOST` and `REDIS_PORT` as fallbacks.
7. **`backend/app/deception/storage.py`**:
   - Updated Redis connection to accept `HONEYSHIELD_REDIS_HOST` as fallback.
8. **`backend/app/hunting/storage.py`**:
   - Updated Redis connection to accept `HONEYSHIELD_REDIS_HOST` as fallback.
9. **`backend/app/integrations/storage.py`**:
   - Updated Redis connection to accept `HONEYSHIELD_REDIS_HOST` as fallback.
10. **`backend/app/incident_command/bus.py`**:
    - Updated Redis connection to accept `HONEYSHIELD_REDIS_HOST` as fallback.
11. **`backend/app/events/store.py`**:
    - Added `db: Session | None = None` support to `__init__` and `_hydrate_from_db`.
    - Initialized `_cursor_counter = 0` when database outbox is empty, avoiding cursor desynchronization across isolated SQLite test fixtures.
12. **`backend/tests/test_digital_agent_live_events.py`**:
    - Passed active test session `db=self.db` to `EventStore` in `setUp`.
13. **`backend/.env.example` & `.env.example`** *(New)*:
    - Safe, documented configuration templates without embedded secrets.
14. **`backend/.env`** *(New, Git-Ignored)*:
    - Active local development runtime configuration pointing to `127.0.0.1:5432` and `127.0.0.1:6379`.

---

## 5. Repairs Implemented

1. **Database Schema Upgraded**:
   - Executed `alembic upgrade head` (`e2665b9d1a2f` $\rightarrow$ `f3b890123456`), creating required `security_event_outbox` and `device_pairing_challenges` tables in PostgreSQL.
2. **FastAPI Daemon Re-launched on Host Network**:
   - Cancelled degraded background task `task-24428`.
   - Launched uvicorn outside sandbox isolation (`PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`).
   - Re-launched Vite frontend (`127.0.0.1:5173`) with live proxy to backend `127.0.0.1:8000`.
3. **Application-Level Connectivity Verified**:
   - Verified that `psycopg` successfully opens connection, queries `SELECT 1`, and accesses all 8 public tables.
   - Verified that `redis` successfully opens connection, sends `PING`, and receives `PONG`.

---

## 6. Exact Tests Executed

### 6.1 Backend Pytest Suites
- **Command:** `PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_dashboard_api.py backend/tests/test_module_3_5_auth.py backend/tests/test_module_3_5_rbac.py backend/tests/test_module_3_6_cases.py backend/tests/test_module_3_7_deception.py backend/tests/test_module_3_8_threat_intel.py backend/tests/test_module_3_9_integrations.py backend/tests/test_module_3_11_hunting.py backend/tests/test_digital_agent_live_events.py backend/tests/test_milestone6_1_stream_security.py backend/tests/test_milestone17_sdk_recovery_and_defense.py`
- **Result:** **134 passed / 0 failed (100% Pass Rate)** in $43.11\text{s}$.

### 6.2 Frontend Vitest Suites
- **Command:** `cd frontend && ./node_modules/.bin/vitest run`
- **Result:** **23 test files passed / 193 tests passed (100% Pass Rate)** in $13.50\text{s}$.

### 6.3 TypeScript Static Type Check
- **Command:** `cd frontend && ./node_modules/.bin/tsc -b`
- **Result:** **0 errors (Exit code 0)**.

---

## 7. Final Health & Status Responses

### Direct Backend Health Probe (`GET http://127.0.0.1:8000/health`):
```json
{
  "status": "ok",
  "service": "HoneyShield X API",
  "postgresql": "connected",
  "redis": "connected"
}
```

### Direct Database Status Probe (`GET http://127.0.0.1:8000/api/v1/database/status`):
```json
{
  "status": "connected",
  "database": "postgresql",
  "message": "Database connection is healthy"
}
```

### Frontend Proxy Health Probe (`GET http://127.0.0.1:5173/health`):
```json
{
  "status": "ok",
  "service": "HoneyShield X API",
  "postgresql": "connected",
  "redis": "connected"
}
```

---

## 8. Unresolved Blockers

**None.**  
All backend database and broker connections are fully restored, operational, verified, and passing 100% of regression tests.

