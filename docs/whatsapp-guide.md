# Panduan Integrasi WhatsApp Business API — PT Cemindo Gemilang Tbk

MRMS Plant Batam mengimplementasikan pola **Adapter Pattern** untuk WhatsApp sehingga provider dapat diganti kapan saja tanpa mengubah *business logic* sistem.

---

## 1. Standar Format Pesan Operasional (Industrial Standard)

Sesuai standar antarmuka operasional pabrik PT Cemindo Gemilang Tbk:
- **Header Baku**: `🏭 *PT CEMINDO GEMILANG Tbk*` \n `📍 *Plant Batam — MRMS*`
- **Garis Pemisah Aman Mobile**: Tepat **17 karakter** `─────────────────` untuk mencegah teks bergeser/offside pada layar smartphone.
- **Indikator Emoji**: 🟢 (Konfirmasi/Check-in), 🔴 (Batal/Check-out), ⚠️ (Terlambat), 🚨 (Overdue).
- **Footer Baku**: `_Pesan Otomatis, MRMS Plant Batam_`

Contoh pesan otomatis yang dihasilkan sistem:
```
🏭 *PT CEMINDO GEMILANG Tbk*
📍 *Plant Batam — MRMS*
─────────────────
🟢 *KONFIRMASI RESERVASI RUANG MEETING*
─────────────────
*Kode Booking:* BKG-20261113-001
*Ruangan:* Ruang Semen Merah Putih
*Lokasi:* Lantai 2 Gedung Admin
*Agenda:* Evaluasi Produksi Semen Curah
*Pemesan:* Budi Santoso (Produksi Semen)
*Jadwal:* 16 Nov 2026, 10:00 s/d 11:30 WIB
─────────────────
_Pesan Otomatis, MRMS Plant Batam_
```

---

## 2. Konfigurasi Environment (`.env`)

Untuk menghubungkan WhatsApp Cloud API atau provider resmi (seperti Qiscus, Waba, Infobip):

```env
NOTIFICATION_MODE=production

# Endpoint WhatsApp API Resmi
WA_API_URL=https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages
WA_API_TOKEN=EAAxxxx...token_akses_panjang_anda...
WA_PHONE_NUMBER_ID=123456789012345
```

---

## 3. Penerima Notifikasi Tim HRGA

Daftar penerima notifikasi otomatis untuk seluruh aktivitas operasional dapat diatur melalui dashboard web Administrator pada menu **Pengaturan Sistem** > **Daftar Penerima Notifikasi Tim HRGA**.

