/**
 * Centralized Permission Catalog & RBAC Configuration
 * PT Cemindo Gemilang Tbk - Plant Batam (MRMS)
 */

const PERMISSION_GROUPS = [
  {
    groupId: 'navigation',
    groupName: 'Akses Navigasi & Menu Modul',
    description: 'Mengatur menu mana saja yang dapat dilihat dan diakses oleh pengguna.',
    permissions: [
      { id: 'menu:dashboard', name: 'Dashboard Utama', desc: 'Akses halaman ringkasan metrik dan live countdown jadwal hari ini' },
      { id: 'menu:rooms', name: 'Katalog Ruangan', desc: 'Akses daftar katalog ruang rapat, fasilitas, dan detail ruangan' },
      { id: 'menu:calendar', name: 'Kalender Jadwal', desc: 'Akses kalender visual dan timeline ketersediaan ruangan' },
      { id: 'menu:bookings_new', name: 'Reservasi Baru', desc: 'Akses formulir pengajuan reservasi booking meeting baru' },
      { id: 'menu:my_bookings', name: 'Booking Saya', desc: 'Akses halaman pengelolaan jadwal rapat pribadi' },
      { id: 'menu:history', name: 'Riwayat Penggunaan', desc: 'Akses arsip riwayat rapat yang telah selesai atau dibatalkan' },
      { id: 'menu:scan_qr', name: 'Scan QR Code', desc: 'Akses scanner kamera untuk check-in dan check-out pintu ruangan' },
      { id: 'menu:live_monitoring', name: 'Live Monitoring', desc: 'Akses monitoring status okupansi live seluruh ruangan rapat' },
      { id: 'menu:all_bookings', name: 'Semua Reservasi', desc: 'Akses melihat daftar booking seluruh karyawan di perusahaan' },
      { id: 'menu:overdue', name: 'Sesi Overdue', desc: 'Akses pemantauan sesi rapat yang melewati batas waktu' },
      { id: 'menu:blocks', name: 'Blokir Ruangan', desc: 'Akses penguncian ruangan untuk perbaikan dan event internal' },
      { id: 'menu:reports', name: 'Laporan & Utilisasi', desc: 'Akses statistik utilisasi, grafik, dan ekspor laporan Excel' },
      { id: 'menu:users', name: 'Kelola Pengguna & Akses', desc: 'Akses manajemen karyawan dan checklist hak akses RBAC' },
      { id: 'menu:departments', name: 'Master Departemen', desc: 'Akses pengelolaan departemen PT Cemindo Gemilang Tbk' },
      { id: 'menu:rooms_master', name: 'Master Ruangan', desc: 'Akses tambah, ubah, dan kelola data fisik ruang rapat' },
      { id: 'menu:qr_management', name: 'QR & Cetak Lembar', desc: 'Akses cetak lembar display QR pintu dan regenerasi token' },
      { id: 'menu:whatsapp', name: 'WhatsApp Gateway', desc: 'Akses status gateway notifikasi WA dan uji kirim pesan' },
      { id: 'menu:notification_logs', name: 'Log Notifikasi', desc: 'Akses riwayat pengiriman pesan WhatsApp dan Email' },
      { id: 'menu:settings', name: 'Pengaturan Sistem', desc: 'Akses parameter operasional, durasi, jam kerja, dsb' },
      { id: 'menu:audit_logs', name: 'Audit Logs Keamanan', desc: 'Akses jejak rekaman aktivitas user dan keamanan sistem' },
    ],
  },
  {
    groupId: 'booking_actions',
    groupName: 'Izin Operasional Reservasi',
    description: 'Mengatur aksi apa saja yang boleh dilakukan pengguna terkait booking rapat.',
    permissions: [
      { id: 'booking:create', name: 'Buat Reservasi Baru', desc: 'Boleh membuat booking jadwal rapat baru' },
      { id: 'booking:reschedule_own', name: 'Reschedule Booking Sendiri', desc: 'Boleh menggeser waktu booking milik sendiri yang belum check-in' },
      { id: 'booking:extend_own', name: 'Perpanjang Waktu (Extend) Sendiri', desc: 'Boleh memperpanjang durasi meeting sendiri yang sedang berlangsung' },
      { id: 'booking:cancel_own', name: 'Batalkan Booking Sendiri', desc: 'Boleh membatalkan booking milik sendiri sebelum selesai' },
      { id: 'booking:edit_any', name: 'Edit Jadwal Reservasi Siapapun (Semua Reservasi)', desc: 'Boleh mengoreksi judul, peserta, ruangan, jadwal waktu, dan status booking siapa saja di menu Semua Reservasi' },
      { id: 'booking:delete_any', name: 'Hapus Reservasi Siapapun (Semua Reservasi)', desc: 'Boleh menghapus permanen data booking siapa saja dari sistem di menu Semua Reservasi' },
    ],
  },
  {
    groupId: 'history_actions',
    groupName: 'Izin Riwayat Penggunaan Ruangan',
    description: 'Mengatur kontrol terhadap arsip dan riwayat penggunaan ruangan masa lalu.',
    permissions: [
      { id: 'history:view', name: 'Lihat Riwayat Penggunaan', desc: 'Dapat membuka dan melihat data riwayat rapat' },
      { id: 'history:edit', name: 'Edit Riwayat (Admin Mode)', desc: 'Dapat mengoreksi data riwayat rapat, catatan, waktu, dan alasan' },
      { id: 'history:delete', name: 'Hapus Riwayat (Admin Mode)', desc: 'Dapat menghapus arsip riwayat penggunaan yang salah atau dibatalkan' },
    ],
  },
  {
    groupId: 'system_admin',
    groupName: 'Izin Kontrol Administratif & Keamanan',
    description: 'Izin tingkat tinggi untuk kontrol darurat dan konfigurasi platform.',
    permissions: [
      { id: 'room:force_checkout', name: 'Force / Manual Checkout Ruangan', desc: 'Melakukan check-out paksa pada ruangan yang ditinggalkan' },
      { id: 'room:block_create', name: 'Kunci / Blokir Ruangan', desc: 'Membuat jadwal maintenance darurat yang membatalkan booking' },
      { id: 'user:manage', name: 'Kelola Pengguna & Hak Akses', desc: 'Mengatur user dan mencentang checklist hak akses karyawan' },
      { id: 'system:settings_edit', name: 'Ubah Konfigurasi Sistem', desc: 'Mengubah parameter global sistem MRMS' },
    ],
  },
];

// Flat list of all permission IDs
const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));

// Default permissions assigned when user's permissions array is empty
const ROLE_DEFAULTS = {
  ADMIN: ALL_PERMISSION_IDS, // Admin gets everything by default
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
 * Resolves effective permissions for a user
 * If custom permissions are configured and non-empty, use them (plus '*' wildcard expansion)
 * If custom permissions are empty/null, fallback to role defaults
 */
function resolveUserPermissions(user) {
  if (!user) return [];

  // If user is ADMIN and has empty permissions or explicitly has '*', return ALL
  if (user.role === 'ADMIN' && (!user.permissions || user.permissions.length === 0 || user.permissions.includes('*'))) {
    return ALL_PERMISSION_IDS;
  }

  // If user has custom permissions specified
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    if (user.permissions.includes('*')) {
      return ALL_PERMISSION_IDS;
    }
    return user.permissions;
  }

  // Fallback to role defaults
  return ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.EMPLOYEE;
}

/**
 * Checks if a user has a specific permission
 */
function checkPermission(user, permissionId) {
  if (!user) return false;
  const effective = resolveUserPermissions(user);
  return effective.includes(permissionId);
}

module.exports = {
  PERMISSION_GROUPS,
  ALL_PERMISSION_IDS,
  ROLE_DEFAULTS,
  resolveUserPermissions,
  checkPermission,
};
