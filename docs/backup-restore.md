# Panduan Backup & Restore Database — PT Cemindo Gemilang MRMS

Sistem telah dilengkapi dengan skrip otomatis untuk melakukan pencadangan (*backup*) dan pemulihan (*restore*) basis data PostgreSQL dengan opsi `--clean --if-exists` yang menjamin integritas skema dan data.

---

## 1. Menjalankan Backup

### Menggunakan PowerShell (Windows):
```powershell
.\scripts\backup.ps1
```

### Menggunakan Bash (Linux/macOS):
```bash
./scripts/backup.sh
```

Hasil backup berupa berkas SQL tersimpan di folder `./backups/` dengan nama berformat:
`mrms_backup_YYYYMMDD_HHMMSS.sql`

---

## 2. Menjalankan Restore

### Menggunakan PowerShell (Windows):
```powershell
.\scripts\restore.ps1 -BackupFile ./backups/mrms_backup_20261113_142129.sql
```

### Menggunakan Bash (Linux/macOS):
```bash
./scripts/restore.sh ./backups/mrms_backup_20261113_142129.sql
```

Skrip ini akan mengeksekusi dump SQL ke dalam kontainer database `mrms-postgres` tanpa perlu mengekspos port database ke publik.

