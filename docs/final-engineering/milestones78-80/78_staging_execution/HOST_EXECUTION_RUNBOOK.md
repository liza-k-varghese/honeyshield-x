# HONEYSHIELD X — MILESTONES 78–80: HOST STAGING RUNBOOK
## OPERATOR PROCEDURES FOR SAFE ISOLATED STAGING CLUSTER EXECUTION

**Document ID:** `HSX-M78-RUNBOOK`  
**Application:** HoneyShield X — Unified Cybersecurity Operations Platform  
**Target Release:** `v1.0.0` (Current Release Candidate: `v1.0.0-rc5`)  
**Host Environment:** Native Host Terminal (Parrot OS Linux)  
**Launcher Script:** [`scripts/staging_preflight_and_launcher.sh`](file:///home/liza/HoneyShield-X/scripts/staging_preflight_and_launcher.sh)  
**Date:** 2026-11-09  

---

### 1. Overview & Operator Control

Because container engines (Docker / Podman) run on the host and communicate over user/system sockets that are isolated from the Antigravity assistant's sandbox namespace, **the staging cluster must be started by the human operator from a native host terminal**.

A specialized, fully automated launcher script [`scripts/staging_preflight_and_launcher.sh`](file:///home/liza/HoneyShield-X/scripts/staging_preflight_and_launcher.sh) has been prepared to ensure zero-risk execution.

---

### 2. Host Staging Execution Runbook

#### Step 1: Open a Native Terminal
Open a terminal on your Parrot OS desktop (outside the Antigravity IDE) and navigate to the project repository:
```bash
cd /home/liza/HoneyShield-X
```

#### Step 2: Run Preflight Checks (Non-Destructive)
Verify that ports, volumes, and Compose configurations are 100% ready:
```bash
./scripts/staging_preflight_and_launcher.sh --check-only
```
*Expected: All checks report `[PASS]`, confirming ports 5174, 8001, 5433, and 6380 are completely free.*

#### Step 3: Launch Staging Cluster
Execute the authorized build and startup command:
```bash
./scripts/staging_preflight_and_launcher.sh --execute
```
*What happens:*
1. Runs full preflight safety checks.
2. Builds the staging backend and frontend containers.
3. Starts PostgreSQL 17, Redis 7, FastAPI backend, and Nginx frontend in the background.
4. Waits up to 60 seconds for all service health probes to return `healthy`.
5. Executes automated HTTP smoke tests against `http://127.0.0.1:8001/api/v1/health` and `http://127.0.0.1:5174/`.
6. Saves execution evidence to `docs/final-engineering/milestones78-80/evidence/staging_execution_evidence.json`.

---

### 3. Staging Verification & Acceptance Testing

Once launched, the operator can immediately inspect the running staging application:

1. **Frontend Production Web App:**
   - Open Mozilla Firefox and visit: **`http://127.0.0.1:5174/`**
   - Confirm the HoneyShield X login page loads.
2. **Backend Health Probe:**
   - Visit: **`http://127.0.0.1:8001/api/v1/health`**
   - Confirm JSON response: `{"status":"ok","service":"HoneyShield X API","postgresql":"connected","redis":"connected"}`.
3. **Container Health & Status:**
   - Run: `docker compose -f docker/docker-compose.staging.yml ps`
   - Confirm all 4 containers show state `Up` and `healthy`.

---

### 4. Safe Teardown Procedures

When staging verification is complete, the operator can safely stop the cluster without impacting development:

#### Option A: Graceful Stop (Preserves Staging Data)
```bash
./scripts/staging_preflight_and_launcher.sh --down
```
*Stops containers and networks. Staging database records in `staging_postgres_data` are preserved.*

#### Option B: Clean Teardown (Removes Staging Volumes)
```bash
./scripts/staging_preflight_and_launcher.sh --clean
```
*Stops containers and removes only `staging_postgres_data` and `staging_redis_data`. Development databases and volumes are 100% untouched.*
