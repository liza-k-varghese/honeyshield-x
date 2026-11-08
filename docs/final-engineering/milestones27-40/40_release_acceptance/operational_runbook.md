# HoneyShield X — Production Operational Runbook

**Release Candidate:** `v1.0.0-rc5`  
**Target Environment:** Linux (Parrot OS / Ubuntu / Debian / RHEL), Docker, Python 3.11+, Node 20+  

---

## 1. System Architecture Overview

HoneyShield X runs as a distributed multi-tier cybersecurity operations platform:
- **Database:** PostgreSQL 17 container (`honeyshield-postgres` on `127.0.0.1:5432`).
- **Cache & Message Broker:** Redis 7 container (`honeyshield-redis` on `127.0.0.1:6379`).
- **API Server:** FastAPI with Uvicorn worker (`127.0.0.1:8000`).
- **Frontend SPA:** React 19 + TypeScript on Vite 6 (`127.0.0.1:5173`).

---

## 2. Standard Service Lifecycle Operations

### Step 1: Start Supporting Infrastructure (Containers)
```bash
# Verify container status
docker ps --filter "name=honeyshield"

# If containers are stopped, start them:
docker start honeyshield-postgres honeyshield-redis

# Confirm TCP port readiness
pg_isready -h 127.0.0.1 -p 5432
redis-cli -h 127.0.0.1 -p 6379 ping  # Expected output: PONG
```

### Step 2: Start the FastAPI Backend
```bash
cd /home/liza/HoneyShield-X
source backend/.venv/bin/activate
export PYTHONPATH=backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
```

### Step 3: Start the Vite Frontend Server
```bash
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/vite --host 127.0.0.1 --port 5173
```

---

## 3. Health & Readiness Verification

Run the operational health probe:
```bash
curl -s http://127.0.0.1:8000/health | jq .
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

Verify the frontend reverse-proxy routing:
```bash
curl -s http://127.0.0.1:5173/health | jq .
```

---

## 4. Disaster Recovery & Troubleshooting

### Problem: `/health` returns `"status": "degraded"`
1. **Check PostgreSQL:**
   ```bash
   pg_isready -h 127.0.0.1 -p 5432
   # If failing, inspect docker container logs:
   docker logs honeyshield-postgres --tail 50
   ```
2. **Check Redis:**
   ```bash
   redis-cli -h 127.0.0.1 -p 6379 ping
   # If failing, restart container:
   docker restart honeyshield-redis
   ```

### Problem: Headless Firefox Screenshot Fails
Headless Firefox fails if another Firefox process is active with default profile:
```bash
P=$(mktemp -d)
firefox --headless --profile "$P" --screenshot=output.png http://127.0.0.1:5173/
rm -rf "$P"
```
