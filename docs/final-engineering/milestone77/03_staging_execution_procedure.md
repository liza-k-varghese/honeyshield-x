# HONEYSHIELD X — MILESTONE 77: STAGING EXECUTION PROCEDURE
## OPERATOR-AUTHORIZED RUNBOOK FOR LOCAL ISOLATED STAGING CLUSTER

**Document ID:** `HSX-M77-03`  
**Application:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Target Release:** `v1.0.0` (Release Candidate: `v1.0.0-rc5`)  
**Staging Compose File:** [`docker/docker-compose.staging.yml`](file:///home/liza/HoneyShield-X/docker/docker-compose.staging.yml)  
**Date:** 2026-11-09  

---

### 1. Safety Guarantees Before Launch

Before launching the staging environment, the following non-interference guarantees have been verified:
1. **Zero Impact on Development Database:** Staging uses `staging_postgres_data` volume and port `5433`. The active development database (`honeyshield` on port `5432`) is completely untouched.
2. **Zero Impact on Development Redis:** Staging uses `staging_redis_data` volume and port `6380`. Development Redis on port `6379` is completely untouched.
3. **Zero Impact on Active Port 5173/8000 Daemons:** Staging runs on ports `5174` (web) and `8001` (API).
4. **Isolated Bridge Network:** All inter-container communication occurs over `honeyshield_staging_net`.

---

### 2. Step-by-Step Staging Launch Runbook

The operator can safely execute these commands from the repository root `/home/liza/HoneyShield-X` on the host machine:

#### Step 1: Preflight Verification
Confirm that ports 5433, 6380, 8001, and 5174 are free on the host:
```bash
ss -tulpn | grep -E ':(5433|6380|8001|5174)\b'
```
*(Expected: No output, indicating all staging ports are available).*

#### Step 2: Build and Start Staging Services
Launch the staging multi-container cluster in the background:
```bash
docker compose -f docker/docker-compose.staging.yml up -d --build
```
*(Docker / Podman will build `Dockerfile.backend` and `Dockerfile.frontend`, start PostgreSQL 17 and Redis 7, wait for health probes, and bind to ports 5174 and 8001).*

#### Step 3: Monitor Staging Startup & Health
Check the operational status of all four staging containers:
```bash
docker compose -f docker/docker-compose.staging.yml ps
```
*(All containers should show `healthy` or `Up`).*

Inspect staging logs if needed:
```bash
docker compose -f docker/docker-compose.staging.yml logs -f
```

#### Step 4: Verify Staging HTTP Endpoints
1. **Backend Health Check:**
   ```bash
   curl -s http://127.0.0.1:8001/api/v1/health
   ```
   *(Expected response: `{"status":"ok","service":"HoneyShield X API","postgresql":"connected","redis":"connected"}`).*
2. **Frontend Production Web Serving:**
   ```bash
   curl -s -I http://127.0.0.1:5174/ | head -n 5
   ```
   *(Expected response: `HTTP/1.1 200 OK`).*

---

### 3. Staging Teardown Runbook

When staging testing is complete, the operator can safely tear down the environment:

#### Option A: Stop Staging Containers (Preserving Staging Data)
```bash
docker compose -f docker/docker-compose.staging.yml down
```
*(Stops containers and networks, leaves staging volumes intact).*

#### Option B: Clean Teardown (Removing Staging Data Volumes)
```bash
docker compose -f docker/docker-compose.staging.yml down -v
```
*(Deletes only `staging_postgres_data` and `staging_redis_data`; development database remains 100% untouched).*
