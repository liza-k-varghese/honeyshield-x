# HoneyShield X — Milestone 21: Release Preparation & Operator Deployment Package

**Target Release Candidate:** `v1.0.0-rc5`  
**Host Environment:** Parrot OS Linux / KDE Plasma / Wayland / Firefox  
**Milestone:** 21 — Master Product Validation & Release Preparation  

---

## 1. Release Package Composition

HoneyShield X Release Candidate 5 (`v1.0.0-rc5`) is packaged as an enterprise-grade cybersecurity operations platform.

### 1.1 Web Platform Scope vs. Mobile Android Scope
- **Web Platform Qualification:** Full production readiness for modern web browsers (Firefox, Chromium) on Linux (Wayland/X11), Windows, and macOS.
- **Android Mobile Platform Boundary:** The repository contains the complete Android native source code, Gradle configurations, APK manifest, and build workflows (`mobile/android/`). However, physical hardware Android device qualification is managed under a separate mobile distribution track; web platform release qualification does not claim Android device hardware sign-off.

---

## 2. Production Deployment Prerequisites

| Component | Minimum Requirement | Recommended Production Specification |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu 22.04+, Debian 12+, Parrot OS 6+) | Enterprise Linux (RHEL 9 / Ubuntu 24.04 LTS) |
| **CPU Architecture** | x86_64 or aarch64 (2 cores) | 4+ vCPU cores |
| **RAM** | 4 GB | 8 GB+ |
| **Python** | 3.11, 3.12, or 3.13 | Python 3.13 LTS |
| **Node.js** | Node.js v18 LTS | Node.js v20.x or v22.x LTS |
| **Database** | SQLite (in-memory dev / single node) | PostgreSQL 16+ with SSL enabled |
| **Cache / Broker** | In-memory event bus (standalone) | Redis 7.2+ Cluster / Sentinel |

---

## 3. Verified Startup Runbook

### Step 1: Environment Preparation
```bash
git clone https://github.com/HoneyShield/HoneyShield-X.git
cd HoneyShield-X

# Python environment setup
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Node environment setup
cd frontend
pnpm install
```

### Step 2: Production Build
```bash
cd frontend
pnpm build
```

### Step 3: Production Service Execution
```bash
# Terminal 1: FastAPI Daemon
PYTHONPATH=backend backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Terminal 2: Static Asset Server / Reverse Proxy (Nginx or Vite preview)
cd frontend
pnpm preview --port 5173 --host 0.0.0.0
```

---

## 4. Rollback & Disaster Recovery Guide

In the event of an operational regression or failed deployment:
1. **Frontend Rollback:** The production build outputs atomic static bundles to `frontend/dist/`. Reverting to a prior build artifact is instant by switching the web server root symlink.
2. **Database Rollback:** Database migrations are tracked via Alembic. To downgrade to a previous schema state:
   ```bash
   cd backend && alembic downgrade -1
   ```
3. **Session Revocation:** To immediately invalidate all active operator sessions across clusters, issue the Redis key purge:
   ```bash
   redis-cli -n 0 KEYS "session:*" | xargs redis-cli -n 0 DEL
   ```

