# Arsitektur Sistem & Dokumentasi API — MRMS PT Cemindo Gemilang Tbk (Plant Batam)

## 1. Ikhtisar Arsitektur

Meeting Room Management System (MRMS) PT Cemindo Gemilang Tbk – Plant Batam dirancang dengan arsitektur **Industrial Enterprise-Grade**, berorientasi pada self-service karyawan tanpa approval, proteksi bentrok jadwal anti double booking di level database PostgreSQL, serta pemisahan waktu rencana (*planned*) dan waktu aktual (*actual usage*).

```
                 Internet / Corporate Intranet
                               │
               ┌───────────────▼───────────────┐
               │    Nginx Reverse Proxy &      │
               │   Frontend Static Host (SPA)  │
               │      (Port 80 / 8080)         │
               │ Subpath: /meeting-room        │
               └───────┬───────────────┬───────┘
                       │               │
      /meeting-room/*  │               │ /meeting-room/api/*
                       ▼               ▼
            ┌──────────────────┐    ┌───────────────────────────────────┐
            │ React 19 + Vite  │    │     Express.js API Service        │
            │ Enterprise UI    │    │ (Authentication, RBAC, Validation)│
            └──────────────────┘    └───────────────┬───────────────────┘
                                                    │
                      ┌─────────────────────────────┼─────────────────────────────┐
                      │                             │                             │
                      ▼                             ▼                             ▼
       ┌────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
       │   Scheduler Service        │ │   Notification Worker     │ │   PostgreSQL Database     │
       │ (20m Reminder, Late        │ │ (Outbox processor, backoff│ │ (GiST Exclusion Overlap,  │
       │  Arrival +15m, Overdue)    │ │  retry, Mock/Prod adapter)│ │  Persistent Volume)       │
       └────────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

---

## 2. Model Data & Skema Database

- **departments**: Master unit kerja pabrik (HRGA, PRD, ENG, LOG, IT, FIN, SHE).
- **users**: Data karyawan, NIK unik, email, nomor WhatsApp/telepon, role (`EMPLOYEE`, `HRGA`, `ADMIN`), departmentId, hash password bcrypt.
- **meeting_rooms**: Master 4 ruang rapat pabrik, kapasitas, lokasi, fasilitas, hash token SHA-256 untuk Check-in dan Check-out.
- **room_facilities**: Inventaris perangkat tiap ruangan (TV 4K, Video Conference Auto-tracking, Mic Wireless, Whiteboard, AC).
- **bookings**: Data pemesanan ruang meeting (*planned*): `startTime`, `endTime`, `attendeesCount`, `status` (`CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW_PENDING`, `NO_SHOW`).
- **room_usage_sessions**: Data pemakaian fisik ruangan (*actual*): `actualCheckin`, `actualCheckout`, `status` (`ACTIVE`, `COMPLETED`, `OVERDUE`), `isManualCheckout`, `manualCheckoutById`, `manualCheckoutReason`, `manualCheckoutActionAt`.
- **booking_history**: Rekam jejak seluruh mutasi status booking (CREATED, RESCHEDULED, EXTENDED, CANCELLED, CHECKED_IN, CHECKED_OUT, MANUAL_CHECKOUT, NO_SHOW_MARKED).
- **room_blocks**: Penutupan ruangan untuk maintenance AC/proyektor atau reservasi direksi/audit manajemen.
- **notification_recipients**: Daftar nomor WhatsApp dan email penerima notifikasi otomatis tim HRGA.
- **notification_outbox**: Tabel queue notifikasi internal PostgreSQL dengan retry exponential backoff (1m, 4m, 16m).
- **notification_logs**: Audit log riwayat pengiriman notifikasi, respons provider eksternal, atau status `MOCK_SENT`.
- **audit_logs**: Audit trail operasional lengkap dengan user actor, resource, action, IP address, user agent, oldValues, dan newValues.
- **system_settings**: Konfigurasi dinamis waktu operasional (08:00–17:00), hari operasional (Senin–Jumat), batas toleransi check-in (15m), reminder meeting (20m), dan durasi booking (30–240 menit).

---

## 3. Spesifikasi Anti Double Booking (PostgreSQL GiST Exclusion)

Untuk menjamin dua pemesan bersamaan tidak dapat membooking ruangan dan waktu yang sama, sistem menggunakan dua lapis proteksi:
1. **Application-Level Advisory Lock**:
   Setiap transaksi pembuatan booking, reschedule, dan perpanjangan waktu memicu `SELECT pg_advisory_xact_lock(hashtext('room_' || roomId));` untuk menyerialisasi permintaan bersamaan pada ruangan yang sama.
2. **Database-Level Exclusion Constraint**:
   ```sql
   ALTER TABLE bookings
   ADD CONSTRAINT no_overlapping_active_bookings
   EXCLUDE USING gist (
     room_id WITH =,
     tstzrange(start_time, end_time, '[)') WITH &&
   )
   WHERE (status IN ('CONFIRMED', 'CHECKED_IN', 'NO_SHOW_PENDING'));
   ```

---

## 4. Ringkasan Endpoint REST API

Semua endpoint berada di bawah prefix `/meeting-room/api` (dan `/api`):

### Autentikasi (`/auth`)
- `POST /auth/login` — Login email & password, mengembalikan JWT token dan data user.
- `GET /auth/me` — Ambil profil user yang sedang login.
- `POST /auth/logout` — Catat audit log logout.

### Ruangan & Ketersediaan (`/rooms`)
- `GET /rooms` — Daftar seluruh ruangan beserta live status (`AVAILABLE`, `OCCUPIED`, `OVERDUE`, `RESERVED`, `MAINTENANCE`).
- `GET /rooms/:id/availability?date=YYYY-MM-DD` — Cek jadwal penggunaan harian ruangan.
- `POST /rooms` — [Admin] Tambah ruangan dan buat token QR check-in & check-out unik.
- `PUT /rooms/:id` — [Admin] Perbarui data ruangan dan fasilitas.
- `GET /rooms/blocks/all` — [HRGA/Admin] Daftar jadwal pemblokiran/maintenance.
- `POST /rooms/blocks` — [HRGA/Admin] Jadwalkan maintenance ruangan (dicek terhadap bentrok booking).
- `DELETE /rooms/blocks/:id` — [HRGA/Admin] Buka kembali blokir ruangan.

### Booking & Reservasi (`/bookings`)
- `GET /bookings` — Daftar booking (filter: date, roomId, userId, status, myOnly).
- `GET /bookings/:id` — Detail booking lengkap dengan timeline rencana vs aktual dan riwayat.
- `POST /bookings` — Buat booking baru self-service (otomatis `CONFIRMED` jika lolos validasi).
- `PUT /bookings/:id/reschedule` — Reschedule booking (hanya sebelum check-in).
- `POST /bookings/:id/extend` — Perpanjang waktu meeting (+15m, +30m, +45m, +60m).
- `POST /bookings/:id/cancel` — Batalkan booking (membatalkan reminder otomatis).

### Sesi Penggunaan & QR (`/room-usage`, `/qr`)
- `POST /room-usage/checkin` — Check-in ruangan dengan validasi QR token & toleransi 15 menit.
- `POST /room-usage/checkout` — Check-out ruangan, mencatat waktu aktual server dan melepaskan status ruangan.
- `POST /room-usage/manual-checkout` — [HRGA/Admin] Tutup penggunaan secara manual dengan mencatat alasan dan waktu selesai terverifikasi.
- `GET /room-usage/active` — [HRGA/Admin] Daftar sesi yang sedang berlangsung.
- `GET /room-usage/overdue` — [HRGA/Admin] Daftar sesi yang telah melewati jam selesai dan belum checkout.
- `POST /qr/validate` — Validasi QR token publik/kamera.
- `POST /qr/rooms/:roomId/rotate` — [Admin] Rotasi token QR ruangan jika lembar fisik rusak.
- `GET /qr/print-sheets` — [Admin] Lembar cetak berpasangan (Check-in & Check-out) siap print.

### Laporan & Log (`/reports`, `/notifications`, `/audit`, `/settings`)
- `GET /reports/room-utilization` — Laporan persentase utilisasi dengan rumus baku.
- `GET /reports/department-usage` — Rekap total jam & sesi per departemen.
- `GET /reports/room-usage` — Data ekspor (tersedia format JSON, `format=xlsx`, `format=csv`).
- `GET /notifications/logs` — Log audit pengiriman email & WhatsApp.
- `POST /notifications/:id/retry` — Retry manual pengiriman notifikasi yang gagal.
- `GET /settings` & `PUT /settings` — Konfigurasi parameter operasional sistem.
- `GET /audit` — Log jejak audit keamanan sistem.

