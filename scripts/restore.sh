#!/bin/bash
# Restore PostgreSQL Database for PT Cemindo Gemilang MRMS
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_backup_file.sql>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "File ${BACKUP_FILE} not found!"
  exit 1
fi

echo "Restoring database from ${BACKUP_FILE}..."
cat "${BACKUP_FILE}" | docker compose exec -T postgres psql -U postgres -d mrms_db

if [ $? -eq 0 ]; then
  echo "Database restored successfully!"
else
  echo "Database restore failed!"
  exit 1
fi

