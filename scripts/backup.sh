#!/bin/bash
# Backup PostgreSQL Database for PT Cemindo Gemilang MRMS
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/mrms_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Starting database backup to ${BACKUP_FILE}..."
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists -d mrms_db > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
  echo "Backup completed successfully! File: ${BACKUP_FILE}"
else
  echo "Backup failed!"
  exit 1
fi

