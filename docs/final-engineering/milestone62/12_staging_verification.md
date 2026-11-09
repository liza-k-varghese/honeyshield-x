# STAGING VERIFICATION & DEPLOYMENT RUNBOOK

**Target Environment:** Staging Pre-Production Cluster  
**Release Gate:** G31, G32, G33  

---

## 1. PRE-DEPLOYMENT SMOKE CHECKLIST

Before promoting Release Candidate `v1.0.0-rc5` to production, execute the following staging validation protocol:

1. **Database Schema & Migrations:** Verify PostgreSQL 17 tables are initialized and sequence generators are intact.
2. **Redis Pub/Sub Connectivity:** Check that `honeyshield:events` channel responds to ping.
3. **Operator Authentication:** Authenticate via `POST /api/v1/auth/login` using staging credentials.
4. **Digital Universe Ingestion Smoke Test:** Ingest test honeypot probe and verify SCOUT -> NEXUS handoff.
5. **UI Smoke Test in Native Firefox:** Open `https://staging-soc.internal/` in Firefox 140.16.0esr, open Universe, and observe all four robots.

---

## 2. STAGING RUNBOOK COMMANDS

```bash
# 1. Start application stack in staging mode
export APP_ENV=staging
export HONEYSHIELD_OPERATORS_JSON='[{"username":"stage_analyst","role":"analyst","password_hash":"..."}]'

# 2. Run backend smoke tests
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_auth_production_hardening.py backend/tests/test_digital_agent_live_events.py -v

# 3. Verify Frontend build
cd frontend && ./node_modules/.bin/vite build

# 4. Verify native browser Marionette test
python3 scripts/verify_m62_firefox_relay.py
```
