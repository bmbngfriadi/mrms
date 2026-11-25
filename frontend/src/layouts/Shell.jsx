import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  Home,
  DoorOpen,
  Calendar,
  PlusCircle,
  Clock,
  QrCode,
  History,
  Activity,
  Layers,
  FileBarChart,
  BellRing,
  Users,
  User,
  Building2,
  Settings,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  Printer,
  Globe,
  MessageSquare,
  Download,
} from 'lucide-react';
import cemindoLogo from '../assets/logo-cemindo.png';

export default function Shell() {
  const { user, role, logout, theme, toggleTheme, isHRGA, isAdmin, hasPermission } = useAuth();
  const { lang, toggleLang, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      alert(t('Untuk install di iPhone/iPad: Buka browser Safari, tekan tombol Share (ikon kotak dengan panah atas), lalu pilih "Add to Home Screen" (Tambah ke Layar Utama).'));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
      isActive
        ? 'bg-brand-500 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR (Fixed w-64 on lg screens)                    */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
              <img
                src={cemindoLogo}
                alt="Semen Merah Putih"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-brand-500 uppercase">
                PT Cemindo Gemilang
              </div>
              <div className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                Plant Batam &bull; MRMS
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Main Operational Links */}
          {(hasPermission('menu:dashboard') ||
            hasPermission('menu:rooms') ||
            hasPermission('menu:calendar') ||
            hasPermission('menu:bookings_new') ||
            hasPermission('menu:my_bookings') ||
            hasPermission('menu:history') ||
            hasPermission('menu:scan_qr')) && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {t('Operasional Karyawan')}
              </div>
              <nav className="space-y-1">
                {hasPermission('menu:dashboard') && (
                  <NavLink to="/" end className={navLinkClass}>
                    <Home size={18} />
                    <span>{t('Dashboard')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:rooms') && (
                  <NavLink to="/rooms" className={navLinkClass}>
                    <DoorOpen size={18} />
                    <span>{t('Ruang Meeting')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:calendar') && (
                  <NavLink to="/calendar" className={navLinkClass}>
                    <Calendar size={18} />
                    <span>{t('Kalender Jadwal')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:bookings_new') && (
                  <NavLink to="/bookings/new" className={navLinkClass}>
                    <PlusCircle size={18} />
                    <span>{t('Reservasi Baru')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:my_bookings') && (
                  <NavLink to="/my-bookings" className={navLinkClass}>
                    <Clock size={18} />
                    <span>{t('Booking Saya')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:history') && (
                  <NavLink to="/history" className={navLinkClass}>
                    <History size={18} />
                    <span>{t('Riwayat Penggunaan')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:scan_qr') && (
                  <NavLink to="/scan" className={navLinkClass}>
                    <QrCode size={18} />
                    <span>{t('Scan QR Masuk/Keluar')}</span>
                  </NavLink>
                )}
                <NavLink to="/profile" className={navLinkClass}>
                  <User size={18} />
                  <span>{t('Profil Saya')}</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* HRGA & Monitoring Links */}
          {(hasPermission('menu:live_monitoring') ||
            hasPermission('menu:all_bookings') ||
            hasPermission('menu:overdue') ||
            hasPermission('menu:blocks') ||
            hasPermission('menu:reports')) && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-brand-600 dark:text-brand-400 uppercase flex items-center justify-between">
                <span>{t('HRGA Monitoring')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 font-extrabold">
                  HRGA
                </span>
              </div>
              <nav className="space-y-1">
                {hasPermission('menu:live_monitoring') && (
                  <NavLink to="/admin/live-monitoring" className={navLinkClass}>
                    <Activity size={18} />
                    <span>{t('Live Room Monitoring')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:all_bookings') && (
                  <NavLink to="/admin/all-bookings" className={navLinkClass}>
                    <Layers size={18} />
                    <span>{t('Semua Reservasi')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:overdue') && (
                  <NavLink to="/admin/overdue" className={navLinkClass}>
                    <AlertTriangle size={18} />
                    <span>{t('Sesi Overdue & Manual')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:blocks') && (
                  <NavLink to="/admin/blocks" className={navLinkClass}>
                    <ShieldCheck size={18} />
                    <span>{t('Blokir & Maintenance')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:reports') && (
                  <NavLink to="/admin/reports" className={navLinkClass}>
                    <FileBarChart size={18} />
                    <span>{t('Laporan & Utilisasi')}</span>
                  </NavLink>
                )}
              </nav>
            </div>
          )}

          {/* Administrator Master Data */}
          {(hasPermission('menu:users') ||
            hasPermission('menu:departments') ||
            hasPermission('menu:rooms_master') ||
            hasPermission('menu:qr_management') ||
            hasPermission('menu:whatsapp') ||
            hasPermission('menu:notification_logs') ||
            hasPermission('menu:settings') ||
            hasPermission('menu:audit_logs')) && (
            <div>
              <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                <span>{t('Administrasi Sistem')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-extrabold">
                  ADMIN
                </span>
              </div>
              <nav className="space-y-1">
                {hasPermission('menu:users') && (
                  <NavLink to="/admin/users" className={navLinkClass}>
                    <Users size={18} />
                    <span>{t('Kelola Pengguna')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:departments') && (
                  <NavLink to="/admin/departments" className={navLinkClass}>
                    <Building2 size={18} />
                    <span>{t('Departemen')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:rooms_master') && (
                  <NavLink to="/admin/rooms" className={navLinkClass}>
                    <DoorOpen size={18} />
                    <span>{t('Master Ruangan')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:qr_management') && (
                  <NavLink to="/admin/qr-management" className={navLinkClass}>
                    <Printer size={18} />
                    <span>{t('QR Tok & Cetak Lembar')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:whatsapp') && (
                  <NavLink to="/admin/whatsapp" className={navLinkClass}>
                    <MessageSquare size={18} />
                    <span>WhatsApp Gateway</span>
                  </NavLink>
                )}
                {hasPermission('menu:notification_logs') && (
                  <NavLink to="/admin/notification-logs" className={navLinkClass}>
                    <BellRing size={18} />
                    <span>{t('Log WhatsApp & Email')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:settings') && (
                  <NavLink to="/admin/settings" className={navLinkClass}>
                    <Settings size={18} />
                    <span>{t('Pengaturan Sistem')}</span>
                  </NavLink>
                )}
                {hasPermission('menu:audit_logs') && (
                  <NavLink to="/admin/audit-logs" className={navLinkClass}>
                    <ShieldCheck size={18} />
                    <span>{t('Audit Logs')}</span>
                  </NavLink>
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition cursor-pointer"
            title="Buka Pengaturan Profil Saya"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.name?.substring(0, 2) || 'CG'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {user?.name || 'Karyawan'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user?.department?.code || user?.role || 'Batam'}
              </div>
            </div>
          </NavLink>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLang}
              className="px-2 py-1 rounded-lg text-xs font-black text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase"
              title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              {lang}
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              title="Toggle Tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title={t('Keluar')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE TOP BAR (Enlarged h-16 / 64px on < lg)                   */}
      {/* ============================================================== */}
      <header className="lg:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            <img
              src={cemindoLogo}
              alt="Semen Merah Putih"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-[11px] font-black text-brand-500 uppercase tracking-wider">
              PT Cemindo Gemilang
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-white">
              Plant Batam &bull; MRMS
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase"
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            {lang}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NavLink
            to="/profile"
            className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center"
            title="Buka Profil Saya"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name?.substring(0, 2) || 'CG'}
              </div>
            )}
          </NavLink>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA                                              */}
      {/* ============================================================== */}
      <main className="flex-1 lg:pl-64 pb-24 lg:pb-8 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>

      {/* ============================================================== */}
      {/* MOBILE ENLARGED BOTTOM NAVIGATION BAR (h-[68px], 5 SLOTS)      */}
      {/* Slot 3: Center Floating Action Dock for QR Scanner / Booking  */}
      {/* ============================================================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-[68px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-around px-2 shadow-lg">
        {/* Slot 1: Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors ${
              isActive ? 'text-brand-500 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Home size={20} />
          <span className="text-[10px]">{t('Home')}</span>
        </NavLink>

        {/* Slot 2: Ruangan */}
        <NavLink
          to="/rooms"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors ${
              isActive ? 'text-brand-500 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <DoorOpen size={20} />
          <span className="text-[10px]">{t('Ruangan')}</span>
        </NavLink>

        {/* Slot 3: CENTER FLOATING ACTION DOCK (Melayang di tengah bar) */}
        <div className="relative flex items-center justify-center w-14">
          <button
            onClick={() => setScanModalOpen(true)}
            className="-mt-7 w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 via-brand-500 to-rose-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 active:scale-95 transition-transform"
            title={t('Scan QR')}
          >
            <QrCode size={26} />
          </button>
        </div>

        {/* Slot 4: My Bookings */}
        <NavLink
          to="/my-bookings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors ${
              isActive ? 'text-brand-500 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Clock size={20} />
          <span className="text-[10px]">{t('Booking')}</span>
        </NavLink>

        {/* Slot 5: Menu (Buka Native Bottom Sheet Modal) */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center w-14 h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors`}
        >
          <Menu size={20} />
          <span className="text-[10px]">{t('Menu')}</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* NATIVE BOTTOM SHEET MODAL (Mobile Menu)                        */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sheet Panel */}
          <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl border-t border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Menu MRMS</h3>
                <p className="text-xs text-slate-500">PT Cemindo Gemilang Tbk &bull; Plant Batam</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Card inside Bottom Sheet */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                      {user?.name?.substring(0, 2) || 'CG'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800 dark:text-white truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {user?.nik} &bull; {user?.department?.name || 'Plant Batam'}
                    </div>
                    <div className="mt-0.5 inline-block text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-500 text-white">
                      {user?.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={toggleLang}
                    className="btn btn-ghost text-xs px-2 py-1.5 uppercase font-bold text-slate-700 dark:text-slate-200"
                    title="Switch Language (ID/EN)"
                  >
                    {lang}
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="btn btn-ghost text-xs p-2 text-slate-600 dark:text-slate-300"
                    title="Ganti Mode Tema"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>

              {/* Bottom Sheet Profile Navigation Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-secondary flex-1 text-xs py-2 font-bold flex items-center justify-center gap-1.5"
                >
                  <User size={14} />
                  <span>Pengaturan Profil & Ganti Password</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost text-xs text-rose-500 py-2 px-3 font-bold"
                  title="Keluar"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>

            {/* Links in Bottom Sheet */}
            <div className="space-y-4">
              {/* Employee Navigation */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {t('Navigasi Karyawan')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {hasPermission('menu:calendar') && (
                    <NavLink
                      to="/calendar"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <Calendar size={16} className="text-brand-500" />
                      <span>{t('Kalender')}</span>
                    </NavLink>
                  )}
                  {hasPermission('menu:history') && (
                    <NavLink
                      to="/history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <History size={16} className="text-brand-500" />
                      <span>{t('Riwayat')}</span>
                    </NavLink>
                  )}
                  {hasPermission('menu:rooms') && (
                    <NavLink
                      to="/rooms"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <DoorOpen size={16} className="text-brand-500" />
                      <span>{t('Ruangan')}</span>
                    </NavLink>
                  )}
                  {hasPermission('menu:my_bookings') && (
                    <NavLink
                      to="/my-bookings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                      <Clock size={16} className="text-brand-500" />
                      <span>{t('Booking')}</span>
                    </NavLink>
                  )}
                </div>
              </div>

              {/* HRGA Operations */}
              {(hasPermission('menu:live_monitoring') ||
                hasPermission('menu:all_bookings') ||
                hasPermission('menu:overdue') ||
                hasPermission('menu:blocks') ||
                hasPermission('menu:reports')) && (
                <div>
                  <div className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-2">
                    {t('Fitur HRGA & Operasional')}
                  </div>
                  <div className="space-y-1.5">
                    {hasPermission('menu:live_monitoring') && (
                      <NavLink
                        to="/admin/live-monitoring"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-emerald-500" />
                          <span>{t('Live Room Monitoring')}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </NavLink>
                    )}
                    {hasPermission('menu:all_bookings') && (
                      <NavLink
                        to="/admin/all-bookings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <Layers size={16} className="text-brand-500" />
                          <span>{t('Semua Reservasi')}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </NavLink>
                    )}
                    {hasPermission('menu:overdue') && (
                      <NavLink
                        to="/admin/overdue"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-500" />
                          <span>{t('Sesi Overdue & Manual')}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </NavLink>
                    )}
                    {hasPermission('menu:reports') && (
                      <NavLink
                        to="/admin/reports"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileBarChart size={16} className="text-blue-500" />
                          <span>{t('Laporan & Utilisasi')}</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {/* Master Administrator */}
              {(hasPermission('menu:users') ||
                hasPermission('menu:departments') ||
                hasPermission('menu:rooms_master') ||
                hasPermission('menu:qr_management') ||
                hasPermission('menu:whatsapp') ||
                hasPermission('menu:notification_logs') ||
                hasPermission('menu:settings') ||
                hasPermission('menu:audit_logs')) && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('Master Administrator')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {hasPermission('menu:users') && (
                      <NavLink
                        to="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Users size={16} className="text-brand-500" />
                        <span>{t('Pengguna & Akses')}</span>
                      </NavLink>
                    )}
                    {hasPermission('menu:rooms_master') && (
                      <NavLink
                        to="/admin/rooms"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <DoorOpen size={16} className="text-brand-500" />
                        <span>{t('Ruangan')}</span>
                      </NavLink>
                    )}
                    {hasPermission('menu:qr_management') && (
                      <NavLink
                        to="/admin/qr-management"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Printer size={16} className="text-brand-500" />
                        <span>{t('QR Print')}</span>
                      </NavLink>
                    )}
                    {hasPermission('menu:whatsapp') && (
                      <NavLink
                        to="/admin/whatsapp"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <MessageSquare size={16} className="text-brand-500" />
                        <span>WA Gateway</span>
                      </NavLink>
                    )}
                    {hasPermission('menu:settings') && (
                      <NavLink
                        to="/admin/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <Settings size={16} className="text-brand-500" />
                        <span>{t('Pengaturan')}</span>
                      </NavLink>
                    )}
                    {hasPermission('menu:audit_logs') && (
                      <NavLink
                        to="/admin/audit-logs"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <ShieldCheck size={16} className="text-brand-500" />
                        <span>{t('Audit Logs')}</span>
                      </NavLink>
                    )}
                  </div>
                </div>
              )}

              {/* Install App as PWA button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download size={16} />
                  <span>{t('Install Aplikasi ke Ponsel (PWA)')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUICK ACTION MODAL (Scan Checkin / Scan Checkout / New Booking) */}
      {/* ============================================================== */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {t('Aksi Cepat Ruangan', 'Quick Room Actions')}
              </h3>
              <button
                onClick={() => setScanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setScanModalOpen(false);
                  navigate('/scan/checkin');
                }}
                className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-start px-4 py-3 gap-3 text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold">{t('Scan QR Check-In')}</div>
                  <div className="text-[11px] opacity-80">{t('Pindai QR pada pintu ruangan saat meeting dimulai.')}</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setScanModalOpen(false);
                  navigate('/scan/checkout');
                }}
                className="w-full btn bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-start px-4 py-3 gap-3 text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold">{t('Scan QR Check-Out')}</div>
                  <div className="text-[11px] opacity-80">{t('Pindai QR keluar saat selesai menggunakan ruangan meeting.')}</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setScanModalOpen(false);
                  navigate('/bookings/new');
                }}
                className="w-full btn btn-primary flex items-center justify-start px-4 py-3 gap-3 text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <PlusCircle size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold">{t('Reservasi Baru')}</div>
                  <div className="text-[11px] opacity-80">{t('Pesan Ruangan Ini')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

