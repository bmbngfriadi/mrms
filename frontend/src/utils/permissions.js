/**
 * Frontend Permission Catalog & Role Defaults
 * PT Cemindo Gemilang Tbk - Plant Batam (MRMS)
 */

export const PERMISSION_GROUPS = [
  {
    groupId: 'navigation',
    groupName: 'Akses Navigasi & Menu Modul',
    description: 'Mengatur menu mana saja di sidebar dan mobile bar yang dapat diakses karyawan.',
    permissions: [
      { id: 'menu:dashboard', name: 'Dashboard Utama', desc: 'Melihat metrik okupansi, countdown rapat berikutnya, dan ringkasan hari ini' },
      { id: 'menu:rooms', name: 'Katalog Ruangan', desc: 'Melihat daftar ruangan meeting, kapasitas, fasilitas, dan foto ruangan' },
      { id: 'menu:calendar', name: 'Kalender Jadwal', desc: 'Melihat timeline jadwal dan kalender interaktif seluruh ruangan' },
      { id: 'menu:bookings_new', name: 'Reservasi Baru', desc: 'Mengisi form pengajuan booking ruangan rapat baru' },
      { id: 'menu:my_bookings', name: 'Booking Saya', desc: 'Melihat, mengubah, dan memantau booking milik akun aktif' },
      { id: 'menu:history', name: 'Riwayat Penggunaan', desc: 'Melihat arsip riwayat rapat yang telah selesai, dibatalkan, atau no-show' },
      { id: 'menu:scan_qr', name: 'Scan QR Masuk/Keluar', desc: 'Memindai QR scanner kamera untuk Check-in dan Check-out pintu' },
      { id: 'menu:live_monitoring', name: 'Live Room Monitoring', desc: 'Memantau status live okupansi seluruh ruangan rapat secara real-time' },
      { id: 'menu:all_bookings', name: 'Semua Reservasi', desc: 'Melihat seluruh reservasi rapat semua karyawan di perusahaan' },
      { id: 'menu:overdue', name: 'Sesi Overdue & Manual', desc: 'Memantau rapat yang melebihi durasi dan melakukan force checkout' },
      { id: 'menu:blocks', name: 'Blokir Ruangan / Maintenance', desc: 'Mengunci ruangan dari booking umum untuk perawatan atau acara direksi' },
      { id: 'menu:reports', name: 'Laporan & Utilisasi', desc: 'Melihat analitik utilisasi ruangan dan mengunduh laporan Excel' },
      { id: 'menu:users', name: 'Kelola Pengguna & Hak Akses', desc: 'Mengelola akun karyawan, role, dan checklist hak akses RBAC (Admin)' },
      { id: 'menu:departments', name: 'Master Departemen', desc: 'Mengelola daftar departemen PT Cemindo Gemilang Tbk' },
      { id: 'menu:rooms_master', name: 'Master Ruangan & Fasilitas', desc: 'Menambah dan mengedit ruangan rapat, kapasitas, dan fasilitas' },
      { id: 'menu:qr_management', name: 'QR Management & Cetak', desc: 'Regenerasi token QR dan mencetak lembar display QR pintu' },
      { id: 'menu:whatsapp', name: 'WhatsApp Gateway', desc: 'Koneksi perangkat gateway notifikasi WA dan uji coba kirim pesan' },
      { id: 'menu:notification_logs', name: 'Log Notifikasi', desc: 'Melihat log pengiriman pesan otomatis WhatsApp dan Email' },
      { id: 'menu:settings', name: 'Pengaturan Sistem', desc: 'Mengubah parameter operasional, durasi, jam kerja, dsb' },
      { id: 'menu:audit_logs', name: 'Audit Logs Keamanan', desc: 'Melihat rekaman aktivitas keamanan dan audit trail sistem' },
    ],
  },
  {
    groupId: 'booking_actions',
    groupName: 'Izin Operasional Reservasi',
    description: 'Mengatur hak pengubahan dan penghapusan jadwal reservasi.',
    permissions: [
      { id: 'booking:create', name: 'Buat Reservasi Baru', desc: 'Dapat mengajukan booking jadwal meeting baru' },
      { id: 'booking:reschedule_own', name: 'Reschedule Booking Sendiri', desc: 'Menggeser jadwal booking milik sendiri sebelum waktu check-in' },
      { id: 'booking:extend_own', name: 'Perpanjang Waktu (Extend) Sendiri', desc: 'Memperpanjang durasi meeting sendiri yang sedang berlangsung' },
      { id: 'booking:cancel_own', name: 'Batalkan Booking Sendiri', desc: 'Membatalkan jadwal booking milik sendiri' },
      { id: 'booking:edit_any', name: 'Edit Booking Siapapun (Admin Mode)', desc: 'Mengubah judul, ruangan, waktu, peserta, status booking milik siapapun' },
      { id: 'booking:delete_any', name: 'Hapus Booking (Admin Mode)', desc: 'Menghapus permanen data reservasi siapapun dari sistem' },
    ],
  },
  {
    groupId: 'history_actions',
    groupName: 'Izin Riwayat Penggunaan Ruangan',
    description: 'Mengatur hak pengubahan dan penghapusan arsip riwayat penggunaan.',
    permissions: [
      { id: 'history:view', name: 'Lihat Arsip Riwayat', desc: 'Dapat mengakses dan melihat data riwayat penggunaan ruangan' },
      { id: 'history:edit', name: 'Edit Riwayat (Admin Mode)', desc: 'Mengoreksi data riwayat rapat, catatan agenda, jam checkin/out, atau alasan' },
      { id: 'history:delete', name: 'Hapus Riwayat (Admin Mode)', desc: 'Menghapus catatan arsip riwayat penggunaan dari sistem' },
    ],
  },
  {
    groupId: 'system_admin',
    groupName: 'Izin Administratif & Kontrol Khusus',
    description: 'Izin kontrol darurat dan konfigurasi platform.',
    permissions: [
      { id: 'room:force_checkout', name: 'Force / Manual Checkout', desc: 'Melakukan check-out paksa pada sesi ruangan yang overdue atau ditinggalkan' },
      { id: 'room:block_create', name: 'Kunci / Blokir Ruangan', desc: 'Membuat jadwal maintenance ruangan yang membatalkan booking umum' },
      { id: 'user:manage', name: 'Kelola Pengguna & Hak Akses', desc: 'Mengatur data pengguna dan mengatur checklist hak akses karyawan' },
      { id: 'system:settings_edit', name: 'Ubah Konfigurasi Sistem', desc: 'Mengubah parameter operasional global aplikasi MRMS' },
    ],
  },
];

export const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));

export const ROLE_DEFAULTS = {
  ADMIN: ALL_PERMISSION_IDS,
  HRGA: [
    'menu:dashboard',
    'menu:rooms',
    'menu:calendar',
    'menu:bookings_new',
    'menu:my_bookings',
    'menu:history',
    'menu:scan_qr',
    'menu:live_monitoring',
    'menu:all_bookings',
    'menu:overdue',
    'menu:blocks',
    'menu:reports',
    'booking:create',
    'booking:reschedule_own',
    'booking:extend_own',
    'booking:cancel_own',
    'booking:edit_any',
    'history:view',
    'history:edit',
    'room:force_checkout',
    'room:block_create',
  ],
  EMPLOYEE: [
    'menu:dashboard',
    'menu:rooms',
    'menu:calendar',
    'menu:bookings_new',
    'menu:my_bookings',
    'menu:history',
    'menu:scan_qr',
    'booking:create',
    'booking:reschedule_own',
    'booking:extend_own',
    'booking:cancel_own',
    'history:view',
  ],
};

/**
 * Checks whether user has permission
 */
export function userHasPermission(user, permissionId) {
  if (!user) return false;

  // Admin with empty custom permissions has all permissions
  if (user.role === 'ADMIN' && (!user.customPermissions || user.customPermissions.length === 0)) {
    return true;
  }

  // If user has specific permissions returned from backend
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    if (user.permissions.includes('*') || user.permissions.includes(permissionId)) {
      return true;
    }
  }

  // If user has customPermissions in their profile
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    if (user.customPermissions.includes('*') || user.customPermissions.includes(permissionId)) {
      return true;
    }
    return false;
  }

  // Fallback to role defaults
  const defaults = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.EMPLOYEE;
  return defaults.includes(permissionId);
}
