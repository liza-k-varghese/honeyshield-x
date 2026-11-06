# Milestone 7 — Repository Baseline and Change Inventory

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-05  
**Auditor:** Principal DevSecOps & Release Engineering Lead  

---

## 1. Source Revision & Git Working Tree State

- **Target Branch:** `main`
- **HEAD Commit Hash:** `89ac24934f011bca67b0589c317344b3c159a482`
- **Working Tree Summary:** Working directory contains active Milestone 6.1 and Milestone 7 security, staging, and resilience hardening additions.
- **Unmodified Production Infrastructure:** All production branch references, existing PostgreSQL tables, and operator workspaces remain intact and unperturbed.

### Git Status Inventory
```text
M backend/alembic/env.py
M backend/app/database.py
M backend/app/main.py
M backend/app/routers/events.py
M backend/app/schemas.py
M frontend/src/api/client.ts
M frontend/src/digital-agents/engine/RealtimeAgentWebSocketClient.ts
?? backend/tests/test_milestone6_1_stream_security.py
?? backend/tests/test_milestone7_trust_boundaries.py
?? docker/Dockerfile.backend
?? docker/Dockerfile.frontend
?? docker/docker-compose.staging.yml
?? config/.env.staging.example
?? scripts/backup_restore.sh
?? release/v1.0.0-rc5/
?? docs/release/
```

---

## 2. Environment & System Architecture

| Subsystem | Technology Stack | Active Ports / Bindings |
| :--- | :--- | :--- |
| **Frontend** | React 19.0.0, Vite 6.4.4, TypeScript 5.7.3, Tailwind CSS | Production: `127.0.0.1:5173`, Staging: `127.0.0.1:5174` |
| **Backend API** | FastAPI 0.141.1, Uvicorn, Python 3.13.5 | Production: `127.0.0.1:8000`, Staging: `127.0.0.1:8001` |
| **Database** | PostgreSQL 17, SQLAlchemy 2.1.1, Alembic 1.20.0 | Production: `127.0.0.1:5432`, Staging: `127.0.0.1:5433` |
| **Broker / Cache** | Redis 7 / 8.1.0 client | Production: `127.0.0.1:6379`, Staging: `127.0.0.1:6380` |
| **Client Host** | Parrot OS Linux, KDE Plasma 6 (Wayland) | Standard & Sandboxed Execution Enclave |

---

## 3. Database Migration Inventory

Alembic migrations verified under `backend/alembic/versions`:
1. `e77eb9ef83a6_create_core_honeyshield_tables.py`: Core attacks, attacks_sessions, honeypots, threat_intel, audit_log.
2. `e2665b9d1a2f_add_notification_status_to_alerts.py`: Alert model notification fields (`notification_status`, `push_dispatched`).
3. `f3b890123456_create_security_outbox_and_pairing_tables.py`: Authoritative `security_event_outbox` table and `android_paired_devices` registry.

---

## 4. Change History Since RC4 Baseline

- **SSE Query Parameter Remediation:** Replaced vulnerable `GET /api/v1/events/stream?token=...` with standard `Authorization: Bearer <token>` header streaming using Fetch API ReadableStream fallback.
- **WebSocket Ticket Protocol:** Replaced persistent bearer token in WS query with ephemeral, single-use, 60s expiring cryptographic tickets (`/api/v1/events/ticket`).
- **Input Validation & DoS Hardening:** Added explicit `max_length=10000` to `AttackEventBase.message` to prevent payload bloat.
- **Configurable Connection Strings:** Updated `backend/app/database.py` and `backend/alembic/env.py` to honor `DATABASE_URL` for isolated staging environments.
- **Security Response Headers:** Integrated nosniff, frame-deny, and XSS filtering in FastAPI middleware.

