# Meeting Room Management System (MRMS)
### PT Cemindo Gemilang Tbk – Plant Batam

Aplikasi self-service pengelolaan ruang meeting terintegrasi untuk pabrik PT Cemindo Gemilang Tbk – Plant Batam. Dirancang dengan standar desain enterprise industri (**enterprise-industrial-ui**), bebas dari tampilan AI murahan (*anti-AI slop*), adaptif mode gelap/terang, dan memberikan pengalaman aplikasi mobile native 100% pada smartphone.

---

## 1. Fitur Utama

- **Pemesanan Mandiri Tanpa Approval (Self-Service)**: Karyawan memesan ruangan secara langsung; booking yang valid otomatis berstatus `CONFIRMED`.
- **Proteksi Anti Double Booking Tingkat Database**: Menggunakan PostgreSQL GiST range exclusion constraint (`tstzrange` & `btree_gist`) dan transactional advisory locking per ruangan.
- **Sistem Dua QR Permanen**: Setiap ruangan memiliki 2 lembar QR fisik terpisah:
  - **QR Check-in (Masuk)**: Dipindai saat mulai meeting (toleransi keterlambatan maksimal 15 menit).
  - **QR Check-out (Keluar)**: Dipindai saat meeting selesai untuk melepaskan status ruangan.
- **Pemisahan Waktu Rencana vs Aktual**: Jadwal booking (*planned*) dan waktu aktual check-in/out (*actual usage*) dicatat dan diaudit secara terpisah.
- **Manajemen Keterlambatan & No-Show**: Jika melewati toleransi 15 menit tanpa check-in, sistem menandai sebagai `NO_SHOW_PENDING` dan check-in ditolak sampai pemesan melakukan reschedule.
- **Pengawasan Overdue & Manual Checkout oleh HRGA**: Ruangan tetap berstatus `OCCUPIED` sampai check-out tercatat. Jika pemesan lupa check-out, tim HRGA/Admin dapat menutup sesi secara manual dengan mengisi waktu aktual dan alasan yang diaudit.
- **Sistem Pengingat Otomatis (20 Menit)**: Mengirimkan reminder email dan WhatsApp 20 menit sebelum meeting dimulai.
- **Laporan Utilisasi Ruangan**: Menghitung persentase efisiensi dengan rumus:
  $$\text{Utilization (\%)} = \frac{\text{Actual Usage Hours}}{\text{Available Operational Hours}} \times 100\%$$
- **Ekspor Dokumen**: Mendukung unduhan data penggunaan dalam format **Excel (.xlsx)** dan **CSV**.

---

## 2. Akun Demo & Kredensial Pengujian

> [!IMPORTANT]
> Seluruh akun demo berikut telah di-seed secara otomatis ke dalam basis data:

| Peran (Role) | Nama Karyawan | Departemen | Email Login | Password Demo |
|---|---|---|---|---|
| **Administrator** | Bambang Friadi (Admin) | IT & Otomasi | `admin@cemindogemilang.com` | `Password123!` |
| **HRGA Lead** | Rina Sugiarto | HRGA | `hrga@cemindogemilang.com` | `Password123!` |
| **Employee** | Budi Santoso | Produksi Semen | `budi.santoso@cemindogemilang.com` | `Password123!` |
| **Employee** | Siti Aminah | Engineering | `siti.aminah@cemindogemilang.com` | `Password123!` |
| **Employee** | Hendra Wijaya | Logistik & Jetty | `hendra.wijaya@cemindogemilang.com` | `Password123!` |

> [!WARNING]
> Sebelum melakukan deployment ke lingkungan produksi (*production*), wajib mengganti password seluruh akun di atas melalui dashboard administrator atau query database.

---

## 3. URL Akses Lokal (Subpath Support)

Sistem dirancang berjalan pada subpath `/meeting-room` sesuai target produksi (`https://cg-plantbatam.com/meeting-room`):

| Halaman | URL Lokal | Deskripsi |
|---|---|---|
| **Portal Karyawan / Dashboard** | [http://localhost:8080/meeting-room/](http://localhost:8080/meeting-room/) | Beranda self-service karyawan & booking |
| **Login Sistem** | [http://localhost:8080/meeting-room/login](http://localhost:8080/meeting-room/login) | Halaman login dengan tombol 1-klik akun demo |
| **QR Check-in Masuk** | [http://localhost:8080/meeting-room/scan/checkin](http://localhost:8080/meeting-room/scan/checkin) | Pindai QR pintu ruangan untuk check-in |
| **QR Check-out Keluar** | [http://localhost:8080/meeting-room/scan/checkout](http://localhost:8080/meeting-room/scan/checkout) | Pindai QR pintu ruangan saat selesai rapat |
| **Live Room Monitoring** | [http://localhost:8080/meeting-room/admin/live-monitoring](http://localhost:8080/meeting-room/admin/live-monitoring) | Dashboard live monitoring & manual checkout HRGA |
| **Lembar Cetak QR** | [http://localhost:8080/meeting-room/admin/qr-management](http://localhost:8080/meeting-room/admin/qr-management) | Cetak lembar QR ganda permanen pintu ruangan |
| **API Health Check** | [http://localhost:8080/meeting-room/api/health](http://localhost:8080/meeting-room/api/health) | Endpoint status kesehatan backend |

---

## 4. Cara Menjalankan dengan Docker Compose

### Prasyarat
- Docker Desktop & Docker Compose telah terpasang dan berjalan.

### Langkah-Langkah:
1. **Clone dan Masuk ke Direktori Proyek**:
   ```bash
   cd d:/dev/mrms
   ```

2. **Salin Berkas Konfigurasi Lingkungan**:
   ```bash
   cp .env.example .env
   ```

3. **Bangun Seluruh Container (Build Multi-Stage)**:
   ```bash
   docker compose build
   ```

4. **Jalankan Seluruh Layanan (Detached Mode)**:
   ```bash
   docker compose up -d
   ```

5. **Periksa Status Kontainer**:
   ```bash
   docker compose ps
   ```
   Seluruh 5 layanan (`postgres`, `backend`, `notification-worker`, `scheduler`, `frontend`) akan berstatus `Up (healthy)`.

6. **Melihat Log Aplikasi**:
   ```bash
   docker compose logs -f
   ```

---

## 5. Pengujian Otomatis (Automated Tests)

Sistem telah diuji secara komprehensif menggunakan **Vitest**, mencakup pengujian unit, integrasi API, batasan keterlambatan, hingga pengujian konkurensi anti double booking:

### Menjalankan Seluruh Test Suite:
```bash
cd backend
npm test
```

### Hasil Eksekusi Test Aktual:
```
 ✓ tests/unit/rbac-and-ownership.test.js (3 tests)
 ✓ tests/concurrency/booking-concurrency.test.js (2 tests)
 ✓ tests/unit/validation-and-rules.test.js (12 tests)
 ✓ tests/unit/notifications-and-outbox.test.js (2 tests)
 ✓ tests/integration/api-routes.test.js (5 tests)

 Test Files  5 passed (5)
      Tests  24 passed (24)
   Duration  1.34s
```
- **Total Suite**: 5 suite passed.
- **Total Test**: 24 tests passed (0 failed).

---

## 6. Prosedur Backup & Restore Basis Data

### Backup Database
- **PowerShell (Windows)**:
  ```powershell
  .\scripts\backup.ps1
  ```
- **Bash (Linux)**:
  ```bash
  ./scripts/backup.sh
  ```
Berkas cadangan akan disimpan di folder `./backups/` dengan nama berstempel waktu.

### Restore Database
- **PowerShell (Windows)**:
  ```powershell
  .\scripts\restore.ps1 -BackupFile ./backups/mrms_backup_YYYYMMDD_HHMMSS.sql
  ```
- **Bash (Linux)**:
  ```bash
  ./scripts/restore.sh ./backups/mrms_backup_YYYYMMDD_HHMMSS.sql
  ```

---

## 7. Status Integrasi Eksternal & Known Limitations

- **Email & WhatsApp Provider**:
  - Konfigurasi default berjalan dalam mode **Mock (`NOTIFICATION_MODE=mock`)**.
  - Seluruh alur notifikasi dieksekusi secara nyata end-to-end dan dicatat pada tabel `notification_logs`, namun pesan tidak ditembakkan ke internet.
  - Untuk beralih ke mode live, masukkan kredensial resmi pada berkas `.env` (lihat [docs/smtp-guide.md](file:///d:/dev/mrms/docs/smtp-guide.md) dan [docs/whatsapp-guide.md](file:///d:/dev/mrms/docs/whatsapp-guide.md)).
- **Database Security**:
  - Port PostgreSQL tidak diekspos ke publik (`5432` hanya dapat diakses melalui jaringan internal Docker `mrms_network`).
  - Seluruh token QR ruangan disimpan dalam bentuk hash kriptografi **SHA-256**.
- **Kamera Scanner di Browser**:
  - Web browser memerlukan izin akses kamera HTTPS/localhost untuk mengaktifkan pemindaian video langsung; sistem juga menyediakan alternatif input token instan untuk mempermudah operasional.

