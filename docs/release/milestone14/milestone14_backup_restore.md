# Milestone 14 — PostgreSQL Backup, Restore & Rollback Runbook

**Document ID:** `HSX-DOC-M14-024`  
**Classification:** Disaster Recovery & Database Administration  
**Release Candidate:** `v1.0.0-rc5`  
**Target Date:** 2026-11-06  

---

## 1. Backup Strategy & Procedures

To guarantee zero data loss of critical threat intelligence, outbox audit trails, and forensic incident captures, HoneyShield X implements a two-tier backup architecture:
1. **Continuous WAL Archiving:** Point-in-time recovery (PITR) to isolated backup volume.
2. **Automated Logical Snapshot:** Full export via `pg_dump` compressed with gzip and signed with SHA-256.

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/honeyshield"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/hsx_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"
echo "[+] Executing HoneyShield X PostgreSQL backup..."
pg_dump -U honeyshield_admin -d honeyshield_staging \
  --format=custom --compress=9 --blobs --no-owner > "${BACKUP_FILE}"

sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
echo "[+] Backup completed: ${BACKUP_FILE}"
```

---

## 2. Restore Verification Runbook

### Verification Protocol in Isolated Staging:
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="$1"
echo "[+] Verifying integrity of backup file ${BACKUP_FILE}..."
sha256sum -c "${BACKUP_FILE}.sha256"

echo "[+] Restoring to isolated staging database..."
dropdb -U honeyshield_admin --if-exists honeyshield_staging_restore
createdb -U honeyshield_admin honeyshield_staging_restore

pg_restore -U honeyshield_admin -d honeyshield_staging_restore \
  --clean --if-exists < "${BACKUP_FILE}"

echo "[+] Verifying record counts post-restore..."
psql -U honeyshield_admin -d honeyshield_staging_restore \
  -c "SELECT count(*) AS total_attacks FROM attacks;" \
  -c "SELECT count(*) AS total_alerts FROM alerts;" \
  -c "SELECT count(*) AS total_outbox_events FROM security_event_outbox;"

echo "[+] Restore verification successful."
```

---

## 3. Rollback Safety & Forward-Recovery Protocol

1. **Database Schema Migrations:** If a release candidate migration introduces an incompatible schema, Alembic downgrades must be tested prior to rollout.
2. **Forward-Recovery Strategy:** In the event of irreversible DDL alterations, forward-recovery (re-applying a patched forward migration) is preferred over lossy schema rollbacks.
3. **Never Restore Over Production:** Restores are always directed to a secondary staging instance for verification before cutover.

