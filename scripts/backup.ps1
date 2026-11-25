# Backup PostgreSQL Database for PT Cemindo Gemilang MRMS (PowerShell)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "./backups"
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$backupFile = "$backupDir/mrms_backup_$timestamp.sql"

Write-Host "Starting database backup to $backupFile..."
docker compose exec -T postgres pg_dump -U postgres --clean --if-exists -d mrms_db > $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully! File: $backupFile" -ForegroundColor Green
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
}

