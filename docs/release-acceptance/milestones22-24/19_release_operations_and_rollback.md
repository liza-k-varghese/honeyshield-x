# HoneyShield X — Milestones 22–24: Release Operations, Deployment & Rollback Runbook

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestones:** 22, 23 & 24 Unified Release Engineering  

---

## 1. System Requirements & Hardware Prerequisites

| Resource | Minimum Requirement | Production Recommendation |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu 22.04+, Debian 12+, Parrot OS 6+) | RHEL 9 / Ubuntu 24.04 LTS |
| **CPU Architecture** | x86_64 or aarch64 (2 cores) | 4+ vCPU cores |
| **RAM** | 4 GB | 8 GB+ |
| **Python** | 3.11, 3.12, 3.13 | Python 3.13 LTS |
| **Node.js** | Node.js v18 LTS | Node.js v20.x or v22.x LTS |
| **Database** | SQLite (in-memory standalone) | PostgreSQL 16+ with SSL |
| **Message Broker** | In-memory event bus | Redis 7.2+ Cluster |

---

## 2. Production Deployment Procedure

```bash
# 1. Clone & Environment Setup
git clone https://github.com/HoneyShield/HoneyShield-X.git
cd HoneyShield-X

# 2. Python Environment
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# 3. Node Dependencies & Build
cd frontend
pnpm install
pnpm build

# 4. Service Startup
# Backend Daemon:
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend Static Server / Reverse Proxy:
pnpm preview --port 5173 --host 0.0.0.0
```

---

## 3. Rollback & Disaster Recovery Procedures

1. **Frontend Static Rollback:** The production build compiles to `frontend/dist/`. Reverting to a prior stable release is instantaneous by repointing the web server document root symlink.
2. **Database Migration Downgrade:** Schema changes are tracked via Alembic migrations. To revert to the previous revision:
   ```bash
   cd backend && alembic downgrade -1
   ```
3. **Emergency Session Revocation:** To immediately invalidate all active operator sessions in the event of an administrative breach:
   ```bash
   redis-cli -n 0 KEYS "session:*" | xargs redis-cli -n 0 DEL
   ```
4. **Mobile Release Track Separation:** Android hardware APK generation and device flashing remain strictly isolated under a separate mobile distribution track; web platform deployment does not alter mobile artifact repositories.

