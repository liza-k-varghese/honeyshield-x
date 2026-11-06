# Milestone 7 — Backup, Restore and Rollback Runbook

**Project:** HoneyShield X Unified Cybersecurity Operations Platform  
**Target Release Candidate:** `v1.0.0-rc5`  
**Evaluation Date:** 2026-11-05  

---

## 1. Automated Backup Tooling (`scripts/backup_restore.sh`)

HoneyShield X includes a dedicated disaster recovery tool: `scripts/backup_restore.sh`.

### Key Features & Safety Guards
- **Target Verification:** The script refuses to execute `restore-staging` if the target database name is `honeyshield` (production). It strictly enforces staging/test target naming (`staging` or `test`).
- **Gzip Integrity Check:** Every backup archive is verified via `gzip -t` immediately following extraction.
- **SHA-256 Manifest Generation:** Checksum files are placed adjacent to every generated SQL dump.

---

## 2. Backup Execution Procedure

To create a timestamped, compressed backup of the staging database:
```bash
./scripts/backup_restore.sh backup /var/backups/honeyshield_staging.sql.gz
```

To verify the physical and structural integrity of an existing backup:
```bash
./scripts/backup_restore.sh verify /var/backups/honeyshield_staging.sql.gz
```

---

## 3. Staging Restore Procedure

```bash
# Explicitly sets target to staging database
export TARGET_DB="honeyshield_staging"
export POSTGRES_PORT=5433
./scripts/backup_restore.sh restore-staging /var/backups/honeyshield_staging.sql.gz
```

> [!CAUTION]
> Direct restores to production databases are strictly disallowed by policy and enforced by script validation. Production recovery requires two-person rule authorization and offline maintenance windows.

---

## 4. Rollback Plan

If an unexpected regression is identified post-deployment:
1. **Frontend Rollback:** Revert Nginx symlink or static files to `v1.0.0-rc4` bundle (`honeyshield-frontend-v1.0.0-rc4.tar.gz`).
2. **Backend Rollback:** Downgrade backend container tag or checkout `v1.0.0-rc4` commit.
3. **Database Migration Rollback:**
   - Database schema changes in `v1.0.0-rc5` are additive (`security_event_outbox` and `android_paired_devices` tables).
   - If required, run `alembic downgrade e2665b9d1a2f`.

