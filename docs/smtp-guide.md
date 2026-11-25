# Panduan Integrasi Email SMTP — PT Cemindo Gemilang Tbk

Sistem MRMS mendukung dua mode pengiriman email:
1. **Mock Mode (`NOTIFICATION_MODE=mock`)**:
   - Mode default untuk pengembangan lokal dan pengujian.
   - Seluruh payload email dan riwayat pengiriman tetap diproses end-to-end, dicatat di tabel `notification_logs`, dan dapat diinspeksi melalui halaman *Log Notifikasi*.
   - Email **tidak dikirimkan** ke server SMTP luar sehingga aman dan tidak membutuhkan kredensial email riil saat demonstrasi.
2. **Production Mode (`NOTIFICATION_MODE=production`)**:
   - Menghubungkan langsung ke server SMTP korporat PT Cemindo Gemilang Tbk atau Google Workspace relay.

---

## 1. Konfigurasi Environment (`.env`)

Untuk mengaktifkan pengiriman email riil, sesuaikan parameter berikut pada file `.env`:

```env
NOTIFICATION_MODE=production

# Server SMTP Korporat
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mrms.plantbatam@cemindogemilang.com
SMTP_PASS=kunci_aplikasi_atau_password_smtp_anda
SMTP_FROM=MRMS PT Cemindo Gemilang Tbk <noreply-mrms@cemindogemilang.com>
```

---

## 2. Pengujian Koneksi SMTP

Setelah mengubah `.env`, restart container backend:

```bash
docker compose restart backend notification-worker
```

Jika ada kegagalan kirim (misalnya kredensial salah atau koneksi timeout):
1. Transaksi utama pemesanan ruang meeting **TIDAK AKAN DIBATALKAN** (non-blocking).
2. Pesan akan masuk ke tabel `notification_outbox` dengan status `FAILED`.
3. Background worker akan melakukan *exponential backoff retry* otomatis (1 menit, 4 menit, 16 menit).
4. Administrator atau HRGA dapat menekan tombol **Retry** secara manual pada halaman *Log Notifikasi*.

