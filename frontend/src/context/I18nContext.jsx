import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const I18nContext = createContext(null);

// Comprehensive dictionary for standard enterprise features
const DICTIONARY = {
  // Navigation & Menus
  'Dashboard': { id: 'Dashboard', en: 'Dashboard' },
  'Ruang Meeting': { id: 'Ruang Meeting', en: 'Meeting Rooms' },
  'Kalender Jadwal': { id: 'Kalender Jadwal', en: 'Schedule Calendar' },
  'Kalender': { id: 'Kalender', en: 'Calendar' },
  'Reservasi Baru': { id: 'Reservasi Baru', en: 'New Booking' },
  'Reservasi Ruangan': { id: 'Reservasi Ruangan', en: 'Book a Room' },
  'Booking Saya': { id: 'Booking Saya', en: 'My Bookings' },
  'Riwayat Penggunaan': { id: 'Riwayat Penggunaan', en: 'Usage History' },
  'Riwayat': { id: 'Riwayat', en: 'History' },
  'Scan QR Masuk/Keluar': { id: 'Scan QR Masuk/Keluar', en: 'QR Scan In/Out' },
  'Scan QR': { id: 'Scan QR', en: 'Scan QR' },
  'Profil Saya': { id: 'Profil Saya', en: 'My Profile' },
  'Menu': { id: 'Menu', en: 'Menu' },
  'Home': { id: 'Home', en: 'Home' },
  'Ruangan': { id: 'Ruangan', en: 'Rooms' },
  'Booking': { id: 'Booking', en: 'Bookings' },
  'Operasional Karyawan': { id: 'Operasional Karyawan', en: 'Employee Operations' },
  'Navigasi Karyawan': { id: 'Navigasi Karyawan', en: 'Employee Navigation' },
  'Fitur HRGA': { id: 'Fitur HRGA', en: 'HRGA Features' },
  'HRGA Monitoring': { id: 'HRGA Monitoring', en: 'HRGA Monitoring' },
  'Administrasi Sistem': { id: 'Administrasi Sistem', en: 'System Administration' },
  'Master Administrator': { id: 'Master Administrator', en: 'Master Administration' },

  // HRGA & Admin Menus
  'Live Room Monitoring': { id: 'Live Room Monitoring', en: 'Live Room Monitoring' },
  'Semua Reservasi': { id: 'Semua Reservasi', en: 'All Reservations' },
  'Sesi Overdue & Manual': { id: 'Sesi Overdue & Manual', en: 'Overdue & Manual Checkout' },
  'Sesi Overdue & Manual Checkout': { id: 'Sesi Overdue & Manual Checkout', en: 'Overdue & Manual Checkout' },
  'Blokir & Maintenance': { id: 'Blokir & Maintenance', en: 'Block & Maintenance' },
  'Laporan & Utilisasi': { id: 'Laporan & Utilisasi', en: 'Reports & Utilization' },
  'Laporan': { id: 'Laporan', en: 'Reports' },
  'Log Notifikasi (WA/Mail)': { id: 'Log Notifikasi (WA/Mail)', en: 'Notification Logs (WA/Mail)' },
  'Log WhatsApp & Email': { id: 'Log WhatsApp & Email', en: 'WhatsApp & Email Logs' },
  'Kelola Pengguna': { id: 'Kelola Pengguna', en: 'Manage Users' },
  'Pengguna': { id: 'Pengguna', en: 'Users' },
  'Departemen': { id: 'Departemen', en: 'Departments' },
  'Master Ruangan': { id: 'Master Ruangan', en: 'Master Rooms' },
  'QR Tok & Cetak Lembar': { id: 'QR Tok & Cetak Lembar', en: 'QR Tokens & Print Sheet' },
  'QR Print': { id: 'QR Print', en: 'Print QR' },
  'Pengaturan Sistem': { id: 'Pengaturan Sistem', en: 'System Settings' },
  'Pengaturan': { id: 'Pengaturan', en: 'Settings' },
  'Audit Logs': { id: 'Audit Logs', en: 'Audit Logs' },

  // Auth & Login
  'Masuk ke sistem': { id: 'Masuk ke sistem', en: 'Sign in to system' },
  'Masuk ke Sistem': { id: 'Masuk ke Sistem', en: 'Sign in to System' },
  'Gunakan akun internal yang telah terdaftar.': { id: 'Gunakan akun internal yang telah terdaftar.', en: 'Use your registered corporate account.' },
  'Email / NIK Karyawan': { id: 'Email / NIK Karyawan', en: 'Corporate Email / Employee ID' },
  'Fleksibel (Semua)': { id: 'Fleksibel (Semua)', en: 'Flexible (All)' },
  'Lupa kata sandi akun Anda?': { id: 'Lupa kata sandi akun Anda?', en: 'Forgot your account password?' },
  'Pindai QR langsung di pintu ruangan': { id: 'Pindai QR langsung di pintu ruangan', en: 'Scan QR directly at the room door' },
  'Reset Kata Sandi': { id: 'Reset Kata Sandi', en: 'Reset Password' },
  'Untuk keamanan operasional pabrik, reset kata sandi dilakukan melalui Administrator HRGA atau Divisi IT Plant Batam.': {
    id: 'Untuk keamanan operasional pabrik, reset kata sandi dilakukan melalui Administrator HRGA atau Divisi IT Plant Batam.',
    en: 'For plant operational security, password reset is handled via HRGA Administrator or Batam Plant IT Division.',
  },
  'Kata Sandi': { id: 'Kata Sandi', en: 'Password' },
  'Memverifikasi...': { id: 'Memverifikasi...', en: 'Verifying...' },
  'Keluar': { id: 'Keluar', en: 'Log Out' },
  'Platform operasional gerbang industri untuk reservasi ruang meeting mandiri, pemantauan utilisasi ruangan secara real-time, dan integrasi QR Check-in/Check-out.': {
    id: 'Platform operasional gerbang industri untuk reservasi ruang meeting mandiri, pemantauan utilisasi ruangan secara real-time, dan integrasi QR Check-in/Check-out.',
    en: 'Industrial operational platform for self-service meeting room reservation, real-time utilization monitoring, and QR Check-in/Check-out integration.',
  },
  'Sistem Otentikasi Terintegrasi WhatsApp Gateway & Audit Log': {
    id: 'Sistem Otentikasi Terintegrasi WhatsApp Gateway & Audit Log',
    en: 'Integrated Authentication System with WhatsApp Gateway & Audit Log',
  },

  // Common Actions
  'Simpan': { id: 'Simpan', en: 'Save' },
  'Simpan Perubahan': { id: 'Simpan Perubahan', en: 'Save Changes' },
  'Batal': { id: 'Batal', en: 'Cancel' },
  'Edit': { id: 'Edit', en: 'Edit' },
  'Ubah': { id: 'Ubah', en: 'Edit' },
  'Hapus': { id: 'Hapus', en: 'Delete' },
  'Kembali': { id: 'Kembali', en: 'Back' },
  'Kembali ke Beranda': { id: 'Kembali ke Beranda', en: 'Back to Home' },
  'Kembali ke Daftar Ruangan': { id: 'Kembali ke Daftar Ruangan', en: 'Back to Rooms List' },
  'Pesan Ruangan': { id: 'Pesan Ruangan', en: 'Book Room' },
  'Pesan Ruangan Ini': { id: 'Pesan Ruangan Ini', en: 'Book This Room' },
  'Pesan Sekarang': { id: 'Pesan Sekarang', en: 'Book Now' },
  'Segarkan': { id: 'Segarkan', en: 'Refresh' },
  'Lihat Semua': { id: 'Lihat Semua', en: 'View All' },
  'Detail': { id: 'Detail', en: 'Details' },
  'Detail Reservasi': { id: 'Detail Reservasi', en: 'Booking Details' },
  'Jadwal & Detail': { id: 'Jadwal & Detail', en: 'Schedule & Details' },
  'Jadwal & Fasilitas': { id: 'Jadwal & Fasilitas', en: 'Schedule & Facilities' },
  'Tambah Ruangan': { id: 'Tambah Ruangan', en: 'Add Room' },
  'Tambah Ruangan Baru': { id: 'Tambah Ruangan Baru', en: 'Add New Room' },
  'Tambah Pengguna': { id: 'Tambah Pengguna', en: 'Add User' },
  'Tambah Pengguna Baru': { id: 'Tambah Pengguna Baru', en: 'Add New User' },
  'Tambah Departemen': { id: 'Tambah Departemen', en: 'Add Department' },
  'Konfirmasi Reservasi': { id: 'Konfirmasi Reservasi', en: 'Confirm Booking' },
  'Tutup': { id: 'Tutup', en: 'Close' },
  'Cari': { id: 'Cari', en: 'Search' },
  'Filter': { id: 'Filter', en: 'Filter' },
  'Ekspor': { id: 'Ekspor', en: 'Export' },
  'Unduh CSV': { id: 'Unduh CSV', en: 'Download CSV' },
  'Cetak': { id: 'Cetak', en: 'Print' },
  'Cetak Lembar QR': { id: 'Cetak Lembar QR', en: 'Print QR Sheet' },
  'Rotasi Token': { id: 'Rotasi Token', en: 'Rotate Token' },
  'Perpanjang': { id: 'Perpanjang', en: 'Extend' },
  'Reschedule': { id: 'Reschedule', en: 'Reschedule' },
  'Batalkan': { id: 'Batalkan', en: 'Cancel' },
  'Aksi': { id: 'Aksi', en: 'Action' },
  'Pilih Ruangan': { id: 'Pilih Ruangan', en: 'Select Room' },
  'Memproses...': { id: 'Memproses...', en: 'Processing...' },
  'Memuat...': { id: 'Memuat...', en: 'Loading...' },
  'Memuat ruangan...': { id: 'Memuat ruangan...', en: 'Loading rooms...' },
  'Memuat data...': { id: 'Memuat data...', en: 'Loading data...' },
  'Memuat detail ruangan...': { id: 'Memuat detail ruangan...', en: 'Loading room details...' },
  'Memuat detail reservasi...': { id: 'Memuat detail reservasi...', en: 'Loading booking details...' },
  'Ruangan tidak ditemukan.': { id: 'Ruangan tidak ditemukan.', en: 'Room not found.' },
  'Reservasi tidak ditemukan.': { id: 'Reservasi tidak ditemukan.', en: 'Reservation not found.' },
  'Tidak ada data ditemukan.': { id: 'Tidak ada data ditemukan.', en: 'No data found.' },

  // Filter Tabs
  'Semua': { id: 'Semua', en: 'All' },
  'Akan Datang': { id: 'Akan Datang', en: 'Upcoming' },
  'Sedang Aktif': { id: 'Sedang Aktif', en: 'Currently Active' },

  // QR Scanning
  'Scan Check-In': { id: 'Scan Check-In', en: 'Scan Check-In' },
  'Scan Check-Out': { id: 'Scan Check-Out', en: 'Scan Check-Out' },
  'Check-In Sekarang': { id: 'Check-In Sekarang', en: 'Check-In Now' },
  'Check-Out Sekarang': { id: 'Check-Out Sekarang', en: 'Check-Out Now' },
  'Verifikasi Check-In': { id: 'Verifikasi Check-In', en: 'Verify Check-In' },
  'Verifikasi Check-Out': { id: 'Verifikasi Check-Out', en: 'Verify Check-Out' },
  'QR Check-In': { id: 'QR Check-In', en: 'QR Check-In' },
  'QR Check-Out': { id: 'QR Check-Out', en: 'QR Check-Out' },
  'Scan QR Pintu Ruangan': { id: 'Scan QR Pintu Ruangan', en: 'Scan Room Door QR' },
  'Check-in saat mulai meeting dan check-out saat selesai.': {
    id: 'Check-in saat mulai meeting dan check-out saat selesai.',
    en: 'Check in when meeting begins and check out when finished.',
  },
  'Pindai QR pada pintu ruangan saat meeting dimulai.': {
    id: 'Pindai QR pada pintu ruangan saat meeting dimulai.',
    en: 'Scan the QR on the room door when the meeting starts.',
  },
  'Pindai QR keluar saat selesai menggunakan ruangan meeting.': {
    id: 'Pindai QR keluar saat selesai menggunakan ruangan meeting.',
    en: 'Scan the QR when finished using the meeting room.',
  },
  'Check-In Berhasil!': { id: 'Check-In Berhasil!', en: 'Check-In Successful!' },
  'Check-Out Berhasil!': { id: 'Check-Out Berhasil!', en: 'Check-Out Successful!' },
  'Check-In Ditolak:': { id: 'Check-In Ditolak:', en: 'Check-In Rejected:' },
  'Check-Out Ditolak:': { id: 'Check-Out Ditolak:', en: 'Check-Out Rejected:' },

  // Statuses
  'Tersedia': { id: 'Tersedia', en: 'Available' },
  'Digunakan': { id: 'Digunakan', en: 'Occupied' },
  'Digunakan (Occupied)': { id: 'Digunakan (Occupied)', en: 'Occupied' },
  'Dipesan': { id: 'Dipesan', en: 'Reserved' },
  'Dipesan (Reserved)': { id: 'Dipesan (Reserved)', en: 'Reserved' },
  'Melebihi Jadwal': { id: 'Melebihi Jadwal', en: 'Overdue' },
  'OVERDUE': { id: 'OVERDUE', en: 'OVERDUE' },
  'OCCUPIED': { id: 'OCCUPIED', en: 'OCCUPIED' },
  'AVAILABLE': { id: 'AVAILABLE', en: 'AVAILABLE' },
  'Terkonfirmasi': { id: 'Terkonfirmasi', en: 'Confirmed' },
  'Sedang Digunakan': { id: 'Sedang Digunakan', en: 'Checked In' },
  'Sedang Berlangsung': { id: 'Sedang Berlangsung', en: 'In Progress' },
  'Selesai': { id: 'Selesai', en: 'Completed' },
  'Dibatalkan': { id: 'Dibatalkan', en: 'Cancelled' },
  'Terlambat (>15m)': { id: 'Terlambat (>15m)', en: 'Late (>15m)' },
  'No Show': { id: 'No Show', en: 'No Show' },
  'Maintenance': { id: 'Maintenance', en: 'Maintenance' },
  'Diblokir': { id: 'Diblokir', en: 'Blocked' },
  'Non-aktif': { id: 'Non-aktif', en: 'Inactive' },
  'Aktif': { id: 'Aktif', en: 'Active' },

  // Dashboard Stats & Text
  'Total Ruangan': { id: 'Total Ruangan', en: 'Total Rooms' },
  'Siap digunakan': { id: 'Siap digunakan', en: 'Ready to use' },
  'Sedang aktif': { id: 'Sedang aktif', en: 'Currently active' },
  'Melebihi jadwal': { id: 'Melebihi jadwal', en: 'Past schedule' },
  'Agenda Booking Saya Hari Ini': { id: 'Agenda Booking Saya Hari Ini', en: "My Today's Bookings" },
  'Status Ketersediaan Ruangan': { id: 'Status Ketersediaan Ruangan', en: 'Room Availability Status' },
  'Daftar Lengkap': { id: 'Daftar Lengkap', en: 'Full List' },
  'Halo': { id: 'Halo', en: 'Hello' },

  // Forms & Labels
  'Kapasitas': { id: 'Kapasitas', en: 'Capacity' },
  'Lokasi': { id: 'Lokasi', en: 'Location' },
  'Fasilitas': { id: 'Fasilitas', en: 'Facilities' },
  'Daftar Fasilitas': { id: 'Daftar Fasilitas', en: 'Facilities List' },
  'Jadwal Ruangan': { id: 'Jadwal Ruangan', en: 'Room Schedule' },
  'Agenda / Topik Meeting': { id: 'Agenda / Topik Meeting', en: 'Meeting Agenda / Topic' },
  'Meeting Internal': { id: 'Meeting Internal', en: 'Internal Meeting' },
  'Meeting Tamu / Vendor': { id: 'Meeting Tamu / Vendor', en: 'Guest / Vendor Meeting' },
  'Review Manajemen': { id: 'Review Manajemen', en: 'Management Review' },
  'Pelatihan / Workshop': { id: 'Pelatihan / Workshop', en: 'Training / Workshop' },
  'Jumlah Peserta': { id: 'Jumlah Peserta', en: 'Number of Attendees' },
  'Semua Kapasitas': { id: 'Semua Kapasitas', en: 'All Capacities' },
  'Semua Ruangan': { id: 'Semua Ruangan', en: 'All Rooms' },
  'orang': { id: 'orang', en: 'people' },
  'Orang': { id: 'Orang', en: 'People' },
  'Maks.': { id: 'Maks.', en: 'Max.' },
  'Kode Reservasi': { id: 'Kode Reservasi', en: 'Booking Code' },
  'Kode Reservasi:': { id: 'Kode Reservasi:', en: 'Booking Code:' },
  'Agenda': { id: 'Agenda', en: 'Agenda' },
  'Agenda:': { id: 'Agenda:', en: 'Agenda:' },
  'Waktu Masuk': { id: 'Waktu Masuk', en: 'Check-In Time' },
  'Waktu Masuk:': { id: 'Waktu Masuk:', en: 'Check-In Time:' },
  'Waktu Selesai': { id: 'Waktu Selesai', en: 'Check-Out Time' },
  'Waktu Selesai:': { id: 'Waktu Selesai:', en: 'Check-Out Time:' },
  'Status Ruangan': { id: 'Status Ruangan', en: 'Room Status' },
  'Status Ruangan:': { id: 'Status Ruangan:', en: 'Room Status:' },
  'Pemesan': { id: 'Pemesan', en: 'Organizer' },
  'Pemesan:': { id: 'Pemesan:', en: 'Organizer:' },
  'Tanggal': { id: 'Tanggal', en: 'Date' },
  'Waktu': { id: 'Waktu', en: 'Time' },
  'Durasi': { id: 'Durasi', en: 'Duration' },
  'Catatan': { id: 'Catatan', en: 'Notes' },
  'Peran': { id: 'Peran', en: 'Role' },
  'Status Akun': { id: 'Status Akun', en: 'Account Status' },
  'Nomor WhatsApp': { id: 'Nomor WhatsApp', en: 'WhatsApp Number' },
  'Alasan': { id: 'Alasan', en: 'Reason' },
  'Petugas': { id: 'Petugas', en: 'Officer' },
  'Pengaturan Operasional': { id: 'Pengaturan Operasional', en: 'Operational Settings' },
  'Jam Operasional': { id: 'Jam Operasional', en: 'Operating Hours' },
  'Hari Operasional': { id: 'Hari Operasional', en: 'Operating Days' },
  'Batas Booking': { id: 'Batas Booking', en: 'Booking Horizon' },
  'Durasi Minimum': { id: 'Durasi Minimum', en: 'Minimum Duration' },
  'Durasi Maksimum': { id: 'Durasi Maksimum', en: 'Maximum Duration' },
  'Toleransi Check-In': { id: 'Toleransi Check-In', en: 'Check-In Tolerance' },
  'Waktu Reminder': { id: 'Waktu Reminder', en: 'Reminder Lead Time' },
  'Pengingat Sebelum Mulai': { id: 'Pengingat Sebelum Mulai', en: 'Reminder Before Start' },
  'Penerima HRGA': { id: 'Penerima HRGA', en: 'HRGA Recipients' },
  'Sesi Overdue': { id: 'Sesi Overdue', en: 'Overdue Sessions' },
  'Manual Checkout': { id: 'Manual Checkout', en: 'Manual Checkout' },
  'Tutup Sesi': { id: 'Tutup Sesi', en: 'Close Session' },
  'Tutup Sesi Penggunaan': { id: 'Tutup Sesi Penggunaan', en: 'Close Usage Session' },
};

// Word-level smart auto-translation map for future and unmapped words/phrases
const VOCABULARY_RULES = [
  // Multi-word phrases first
  [/\bruang meeting\b/gi, 'meeting room'],
  [/\bruang rapat\b/gi, 'meeting room'],
  [/\bdaftar ruangan\b/gi, 'rooms list'],
  [/\bbooking saya\b/gi, 'my bookings'],
  [/\bsemua ruangan\b/gi, 'all rooms'],
  [/\bsemua departemen\b/gi, 'all departments'],
  [/\btidak ada data\b/gi, 'no data available'],
  [/\btidak ada agenda\b/gi, 'no agenda scheduled'],
  [/\bmemuat data\b/gi, 'loading data'],
  [/\bmemverifikasi\b/gi, 'verifying'],
  [/\bberhasil dikonfirmasi\b/gi, 'successfully confirmed'],
  [/\bselesai digunakan\b/gi, 'usage completed'],
  [/\bpilih ruangan\b/gi, 'select room'],
  [/\bjadwal penggunaan\b/gi, 'usage schedule'],
  [/\bjadwal ruangan\b/gi, 'room schedule'],
  [/\bjam mulai\b/gi, 'start time'],
  [/\bjam selesai\b/gi, 'end time'],
  [/\bjumlah peserta\b/gi, 'attendees count'],
  [/\bcatatan tambahan\b/gi, 'additional notes'],
  [/\bmasuk ke sistem\b/gi, 'sign in to system'],
  [/\bkata sandi\b/gi, 'password'],
  [/\bnomor telepon\b/gi, 'phone number'],
  [/\bnomor hp\b/gi, 'mobile number'],
  [/\bnama lengkap\b/gi, 'full name'],
  [/\bkode ruangan\b/gi, 'room code'],
  [/\bnama ruangan\b/gi, 'room name'],
  [/\blokasi ruangan\b/gi, 'room location'],
  [/\bfasilitas lengkap\b/gi, 'complete facilities'],
  [/\btambah ruangan\b/gi, 'add room'],
  [/\bubah ruangan\b/gi, 'edit room'],
  [/\bhapus ruangan\b/gi, 'delete room'],
  [/\bsimpan data\b/gi, 'save data'],
  [/\bsimpan perubahan\b/gi, 'save changes'],
  [/\bkembali ke\b/gi, 'back to'],
  [/\bhari ini\b/gi, 'today'],
  [/\bminggu ini\b/gi, 'this week'],
  [/\bbulan ini\b/gi, 'this month'],
  [/\bmelebihi jadwal\b/gi, 'past schedule'],
  [/\bsedang aktif\b/gi, 'currently active'],
  [/\bsiap digunakan\b/gi, 'ready to use'],
  [/\bpesan ruangan ini\b/gi, 'book this room'],
  [/\bdaftar fasilitas\b/gi, 'facilities list'],
  [/\btotal pemesanan\b/gi, 'total bookings'],
  [/\btingkat okupansi\b/gi, 'occupancy rate'],
  [/\btambah ruangan baru\b/gi, 'add new room'],
  [/\btambah pengguna baru\b/gi, 'add new user'],
  [/\bruangan baru\b/gi, 'new room'],
  [/\bpengguna baru\b/gi, 'new user'],

  // Single word rules
  [/\bruangan\b/gi, 'room'],
  [/\bruang\b/gi, 'room'],
  [/\brapat\b/gi, 'meeting'],
  [/\bjadwal\b/gi, 'schedule'],
  [/\bpeserta\b/gi, 'attendees'],
  [/\bkapasitas\b/gi, 'capacity'],
  [/\bfasilitas\b/gi, 'facilities'],
  [/\bpengguna\b/gi, 'user'],
  [/\bkaryawan\b/gi, 'employee'],
  [/\bdepartemen\b/gi, 'department'],
  [/\blaporan\b/gi, 'reports'],
  [/\bpengaturan\b/gi, 'settings'],
  [/\bnotifikasi\b/gi, 'notifications'],
  [/\briwayat\b/gi, 'history'],
  [/\btersedia\b/gi, 'available'],
  [/\bdigunakan\b/gi, 'occupied'],
  [/\bdipesan\b/gi, 'reserved'],
  [/\bterlambat\b/gi, 'late'],
  [/\bdibatalkan\b/gi, 'cancelled'],
  [/\bkonfirmasi\b/gi, 'confirm'],
  [/\bselesai\b/gi, 'completed'],
  [/\bmulai\b/gi, 'start'],
  [/\bkeluar\b/gi, 'exit / log out'],
  [/\bmasuk\b/gi, 'enter / log in'],
  [/\bsimpan\b/gi, 'save'],
  [/\bbatal\b/gi, 'cancel'],
  [/\bkembali\b/gi, 'back'],
  [/\bubah\b/gi, 'edit'],
  [/\bhapus\b/gi, 'delete'],
  [/\btambah\b/gi, 'add'],
  [/\bpesan\b/gi, 'book'],
  [/\bsegarkan\b/gi, 'refresh'],
  [/\btutup\b/gi, 'close'],
  [/\bcari\b/gi, 'search'],
  [/\bopsional\b/gi, 'optional'],
  [/\borang\b/gi, 'people'],
  [/\bunit\b/gi, 'units'],
  [/\blantai\b/gi, 'floor'],
  [/\bgedung\b/gi, 'building'],
  [/\balasan\b/gi, 'reason'],
  [/\bpetugas\b/gi, 'officer'],
  [/\bperan\b/gi, 'role'],
  [/\bdurasi\b/gi, 'duration'],
  [/\bmenit\b/gi, 'minutes'],
  [/\bjam\b/gi, 'hours'],
  [/\bhari\b/gi, 'days'],
  [/\bbaru\b/gi, 'new'],
  [/\blama\b/gi, 'old'],
];

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('mrms_lang');
      return saved === 'en' ? 'en' : 'id';
    } catch {
      return 'id';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mrms_lang', lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.error('Failed to save language preference:', e);
    }
  }, [lang]);

  const toggleLang = () => {
    setLangState((prev) => (prev === 'id' ? 'en' : 'id'));
  };

  const setLang = (newLang) => {
    if (newLang === 'en' || newLang === 'id') {
      setLangState(newLang);
    }
  };

  /**
   * Translation function `t(key, fallback)`
   * 1. Checks exact dictionary key.
   * 2. If lang === 'id' and key is Indonesian, returns key (or dictionary match).
   * 3. If lang === 'en', checks dictionary. If missing, applies smart auto-translation rules
   *    so ANY future string or update automatically translates to English!
   */
  const t = (textOrKey, fallback = '') => {
    if (!textOrKey && !fallback) return '';
    const query = (textOrKey || fallback).toString().trim();
    if (!query) return '';

    // Direct dictionary lookup
    if (DICTIONARY[query]) {
      return DICTIONARY[query][lang] || DICTIONARY[query]['id'] || query;
    }

    // Indonesian mode: if not in dictionary, return query/fallback as is
    if (lang === 'id') {
      return query;
    }

    // English mode: intelligent auto-translation for future text
    let translated = query;
    let matched = false;

    for (const [regex, replacement] of VOCABULARY_RULES) {
      if (regex.test(translated)) {
        translated = translated.replace(regex, replacement);
        matched = true;
      }
    }

    // Capitalize first letter if the original was capitalized
    if (matched && query.length > 0 && query[0] === query[0].toUpperCase()) {
      translated = translated.charAt(0).toUpperCase() + translated.slice(1);
    }

    return translated || fallback || query;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      isEn: lang === 'en',
      isId: lang === 'id',
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback safe context if used outside provider
    return {
      lang: 'id',
      setLang: () => {},
      toggleLang: () => {},
      t: (s) => s,
      isEn: false,
      isId: true,
    };
  }
  return ctx;
};

export default I18nContext;
