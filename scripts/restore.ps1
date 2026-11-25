# Restore PostgreSQL Database for PT Cemindo Gemilang MRMS (PowerShell)
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (!(Test-Path -Path $BackupFile)) {
    Write-Host "File $BackupFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Restoring database from $BackupFile..."
Get-Content $BackupFile | docker compose exec -T postgres psql -U postgres -d mrms_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "Database restore failed!" -ForegroundColor Red
}

