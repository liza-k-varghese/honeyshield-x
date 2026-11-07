# HoneyShield X — Milestone 18: Operator-Reviewed Staging Rollout Plan

## 1. Scope & Objective
Defines the safe rollout plan for deploying qualified Tracks A, B, and C to an isolated staging environment.

## 2. Pre-Deployment Checklist
1. **Source Revision:** `7765c35562eb89eba1ab70a41ab7ee30b27f2d53` on branch `main`.
2. **Database State:** PostgreSQL 17.11 instance verified with active connection pool.
3. **Database Backup:** Create pre-deployment snapshot:
   `pg_dump -U liza -h 127.0.0.1 -p 5432 honeyshield_staging > /var/backups/honeyshield_pre_m18.sql`
4. **Environment Variables:** Verify staging secrets (`SECRET_KEY`, `POSTGRES_URL`, `REDIS_URL`) without storing secrets in version control.

## 3. Deployment Steps
1. Pull verified source commit.
2. Build frontend production assets: `(cd frontend && ./node_modules/.bin/vite build)`.
3. Apply database migrations: `(cd backend && PYTHONPATH=. alembic upgrade head)`.
4. Start backend services under staging systemd / supervisor unit.
5. Verify health endpoint: `curl -f http://127.0.0.1:8000/health`.

## 4. Rollback Criteria & Procedure
- **Trigger Conditions:** Any 5xx error rate $> 0.1\%$, health endpoint failure, or database connection pool exhaustion.
- **Rollback Procedure:**
  1. Revert service binary to previous verified release tag `v1.0.0-rc4`.
  2. Restore database snapshot `/var/backups/honeyshield_pre_m18.sql`.
  3. Restart backend service and verify `/health`.

## 5. Non-Deployment Safeguard
In strict adherence to **Part 3 ("NO AUTOMATIC DEPLOYMENT")**, this plan remains staged awaiting explicit operator execution approval.

