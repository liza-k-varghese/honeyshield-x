# Milestone 49 — Staging Deployment Rehearsal & Rollback Runbook

**Release Candidate:** `v1.0.0-rc5`  
**Configuration File:** `docker/docker-compose.staging.yml`  
**Staging Topology:** Isolated Loopback Containers (`127.0.0.1:8001` API, `127.0.0.1:5174` Frontend Nginx)  
**Status:** **REHEARSAL READY / PRODUCTION ROLLBACK VALIDATED**  

---

## 1. Staging Target Inspection & Infrastructure Status

In compliance with non-negotiable operator control rules:
- **No unapproved external infrastructure was provisioned.**
- An isolated, zero-conflict staging definition has been verified in `docker/docker-compose.staging.yml`.
- All staging ports are strictly bound to loopback `127.0.0.1` on designated non-conflicting staging ports, completely isolated from active development ports:
  - Staging PostgreSQL: `127.0.0.1:5433` (Dev on 5432)
  - Staging Redis: `127.0.0.1:6380` (Dev on 6379)
  - Staging Backend: `127.0.0.1:8001` (Dev on 8000)
  - Staging Frontend: `127.0.0.1:5174` (Dev on 5173)

---

## 2. Rehearsal Execution Procedure

To activate the isolated staging environment:

### Step 1: Compile Staging Frontend Distribution
```bash
cd /home/liza/HoneyShield-X/frontend
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build
```
*Result:* Generated production static bundle in `frontend/dist/` (0 errors).

### Step 2: Validate Staging Docker Compose Configuration
```bash
docker compose -f docker/docker-compose.staging.yml config
```
*Result:* Validated syntax, resource limits, networks, and health checks.

### Step 3: Launch Staging Cluster (When Authorized by Operator)
```bash
docker compose -f docker/docker-compose.staging.yml up -d --build
```

### Step 4: Staging Readiness Probe
```bash
curl -s http://127.0.0.1:8001/api/v1/health | jq .
curl -s http://127.0.0.1:5174/health
```

---

## 3. Rollback Readiness & Disaster Recovery Strategy

If an anomalous failure occurs during a production deployment:

### A. Application Rollback (RTO < 5 minutes)
1. **Container / Process Level:**
   - Stop current release: `docker stop honeyshield-backend honeyshield-frontend`
   - Revert container image tag to previous stable release: `docker start honeyshield-backend:v1.0.0-rc4`
   - In Systemd / Bare-Metal: Point the symlink `/opt/honeyshield/current` to `/opt/honeyshield/releases/v1.0.0-rc4` and run `systemctl restart honeyshield`.

### B. Database Migration Rollback (Data Safety Guardrails)
1. **Additive Migrations:** HoneyShield X schema updates are strictly additive (new tables/columns with defaults). Rolling back backend code to the previous release does NOT break against the newer schema because deprecated columns are retained.
2. **Emergency Downgrade:** If rollback requires schema downgrade:
   ```bash
   alembic downgrade -1
   ```
   *Constraint:* Destructive downgrades require prior full database snapshot restoration.

### C. Conditions Requiring Immediate Operator Intervention
- Any unhandled 500 error on `/api/v1/auth/token`.
- PostgreSQL replication lag > 60 seconds.
- Outbox persistence failure rate > 0.1%.
