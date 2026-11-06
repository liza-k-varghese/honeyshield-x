#!/usr/bin/env bash
# HoneyShield X — Staging Database Backup, Integrity Verification & Restore Script
# Usage:
#   ./scripts/backup_restore.sh backup [db_name] [output_file]
#   ./scripts/backup_restore.sh verify [backup_file]
#   ./scripts/backup_restore.sh restore-staging [backup_file] [staging_db_name]

set -euo pipefail

ACTION="${1:-help}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/honeyshield_backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "${BACKUP_DIR}"

case "${ACTION}" in
  backup)
    DB_NAME="${2:-honeyshield}"
    OUT_FILE="${3:-${BACKUP_DIR}/honeyshield_backup_${TIMESTAMP}.sql.gz}"
    echo "[+] Initiating backup of database '${DB_NAME}' -> '${OUT_FILE}'..."
    pg_dump -h "${POSTGRES_HOST:-127.0.0.1}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-honeyshield}" "${DB_NAME}" | gzip -c > "${OUT_FILE}"
    sha256sum "${OUT_FILE}" > "${OUT_FILE}.sha256"
    echo "[+] Backup completed successfully. Checksum:"
    cat "${OUT_FILE}.sha256"
    ;;

  verify)
    FILE="${2:?Error: Provide backup file path}"
    echo "[+] Verifying archive integrity of '${FILE}'..."
    gzip -t "${FILE}"
    if [[ -f "${FILE}.sha256" ]]; then
      echo "[+] Verifying SHA-256 checksum..."
      sha256sum -c "${FILE}.sha256"
    fi
    echo "[+] Backup archive is valid and uncorrupted."
    ;;

  restore-staging)
    FILE="${2:?Error: Provide backup file path}"
    STAGING_DB="${3:-honeyshield_staging}"
    echo "[!] CAUTION: Restoring into isolated staging database '${STAGING_DB}'..."
    gzip -t "${FILE}"
    
    # Ensure restore target is strictly staging/non-production
    if [[ "${STAGING_DB}" == "honeyshield" || "${STAGING_DB}" == "production" ]]; then
      echo "[-] ERROR: Refusing to restore over production database '${STAGING_DB}'!"
      exit 1
    fi

    echo "[+] Dropping and recreating staging database '${STAGING_DB}'..."
    psql -h "${POSTGRES_HOST:-127.0.0.1}" -p "${POSTGRES_PORT:-5433}" -U "${POSTGRES_USER:-honeyshield_staging_user}" -d postgres -c "DROP DATABASE IF EXISTS ${STAGING_DB}; CREATE DATABASE ${STAGING_DB};"
    
    echo "[+] Streaming restore into staging database..."
    gunzip -c "${FILE}" | psql -h "${POSTGRES_HOST:-127.0.0.1}" -p "${POSTGRES_PORT:-5433}" -U "${POSTGRES_USER:-honeyshield_staging_user}" -d "${STAGING_DB}"
    echo "[+] Staging restore completed successfully."
    ;;

  *)
    echo "Usage: $0 {backup|verify|restore-staging}"
    exit 1
    ;;
esac

