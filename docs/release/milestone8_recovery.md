# Milestone 8 — Recovery Engineering, Backup & Rollback Validation

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-06  

---

## 1. Disaster Recovery Script (`scripts/backup_restore.sh`)

Verified disaster recovery utility supporting timestamped dumps, archive verification, and staging restore.

### Command Reference
```bash
# 1. Create a compressed backup
./scripts/backup_restore.sh backup /var/backups/honeyshield_staging.sql.gz

# 2. Verify physical gzip integrity and checksum
./scripts/backup_restore.sh verify /var/backups/honeyshield_staging.sql.gz

# 3. Restore into isolated staging database
export TARGET_DB="honeyshield_staging"
export POSTGRES_PORT=5433
./scripts/backup_restore.sh restore-staging /var/backups/honeyshield_staging.sql.gz
```

### Safety Protections
- **Production Guard:** The script aborts immediately if `TARGET_DB` matches production database `honeyshield`.
- **Integrity Gating:** Restore will not execute if `gzip -t` test fails.

---

## 2. Recovery Scenarios Tested

1. **Redis Crash & Restart:**
   - Simulated Redis restart: in-memory pub/sub safely re-established; missed events hydrated from `security_event_outbox`.
2. **Backend Restart Recovery:**
   - Simulated Uvicorn restart: on startup, `default_event_store` hydrates the latest monotonic cursor from PostgreSQL, preventing cursor regression.
3. **Frontend Rollback:**
   - Static assets are packaged into versioned tarballs (`honeyshield-frontend-v1.0.0-rc5.tar.gz`). Rolling back to `rc4` takes under 10 seconds via web server symlink repointing.
4. **Database Migration Safety:**
   - Alembic migration `f3b890123456` strictly introduces additive tables (`security_event_outbox` and `android_paired_devices`). Reverting via `alembic downgrade e2665b9d1a2f` leaves core alert and attack tables uncorrupted.

