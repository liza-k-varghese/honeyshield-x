# Milestone 44 — Production Deployment Runbook

**Release Candidate:** `v1.0.0-rc5`  
**Target:** Standard Deployment & Operations Manual  

---

## 1. Pre-Deployment Validation Checklist

Before executing an authorized deployment:
- [ ] Confirm all 789 automated tests (Vitest + Pytest) pass.
- [ ] Verify `frontend/dist/` is fresh and compiled without TypeScript errors.
- [ ] Confirm target database has sufficient storage capacity (> 50 GB for audit ledgers).
- [ ] Confirm PostgreSQL user possesses schema migration permissions.
- [ ] Ensure full database snapshot is taken prior to migration execution.

---

## 2. Standard Deployment Execution Steps

### Step 1: Build Production Frontend Assets
```bash
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build
```

### Step 2: Apply Database Schema Migrations
```bash
cd /home/liza/HoneyShield-X
source backend/.venv/bin/activate
export PYTHONPATH=backend
alembic upgrade head
```

### Step 3: Start / Restart Backend Services
```bash
# Using uvicorn with supervisor / systemd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Step 4: Verify Deployment Health
```bash
curl -f -s http://127.0.0.1:8000/health | jq .
```
Expected output:
```json
{
  "status": "ok",
  "service": "HoneyShield X API",
  "postgresql": "connected",
  "redis": "connected"
}
```

---

## 3. Post-Deployment Verification
1. Access the web interface at `https://soc.company.com/`.
2. Confirm the green `3 / 3 Core Systems Operational` banner.
3. Check application logs for unhandled errors: `journalctl -u honeyshield -n 100`.
