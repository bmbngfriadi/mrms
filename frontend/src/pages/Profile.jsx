import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useModal } from '../context/ModalContext';
import api from '../services/api';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  Building2,
  Lock,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  Sparkles,
  AtSign,
  Shield,
  Check,
} from 'lucide-react';
import { PERMISSION_GROUPS } from '../utils/permissions';

export default function Profile() {
  const { user, updateUser, hasPermission } = useAuth();
  const { t } = useI18n();
  const { showAlert, showConfirm: showModalConfirm } = useModal();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Handle Image Selection and Auto-Compression via Canvas
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'danger', text: 'Format file harus berupa gambar (JPG, PNG, atau WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ type: 'danger', text: 'Ukuran foto maksimal adalah 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress / resize image to max 400x400 to keep it lightweight in DB
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarPreview(compressedDataUrl);
        setProfileMessage({ type: 'info', text: 'Foto baru terpilih. Klik "Simpan Profil" untuk menerapkan.' });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProfileMessage({ type: 'info', text: 'Foto profil akan dihapus saat Anda menekan "Simpan Profil".' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const res = await api.put('/auth/profile', {
        name,
        phone,
        avatarUrl: avatarPreview,
      });

      updateUser(res.data.data);
      setProfileMessage({ type: 'success', text: 'Profil dan foto Anda berhasil diperbarui!' });
      showAlert({
        title: 'Profil Diperbarui',
        message: 'Informasi akun dan foto profil Anda telah berhasil disimpan.',
        type: 'success',
      });
    } catch (err) {
      const errText = err.response?.data?.message || 'Gagal menyimpan pembaruan profil.';
      setProfileMessage({ type: 'danger', text: errText });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!currentPassword) {
      setPasswordMessage({ type: 'danger', text: 'Password saat ini wajib diisi.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'danger', text: 'Password baru minimal harus 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'danger', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    const confirmed = await showModalConfirm({
      title: 'Konfirmasi Ubah Kata Sandi',
      message: 'Apakah Anda yakin ingin mengganti kata sandi akun Anda sekarang?',
      type: 'warning',
      confirmText: 'Ya, Ubah Kata Sandi',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    setPasswordSaving(true);

    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ type: 'success', text: 'Password Anda berhasil diperbarui!' });
      showAlert({
        title: 'Password Berhasil Diubah',
        message: 'Kata sandi akun Anda telah diperbarui. Gunakan password baru saat login berikutnya.',
        type: 'success',
      });
    } catch (err) {
      const errText = err.response?.data?.message || 'Gagal mengubah password.';
      setPasswordMessage({ type: 'danger', text: errText });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Pengaturan Profil & Akun
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola foto profil, data kontak, dan ganti kata sandi secara mandiri.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase font-mono">
            {user?.role}
          </span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            Aktif
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN (lg:col-span-5): Identity Card & Photo Upload     */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Identity & Avatar Card */}
          <div className="card p-5 sm:p-6 text-center flex flex-col items-center">
            {/* Avatar Container */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center font-black text-3xl sm:text-4xl uppercase select-none">
                    {user?.name?.substring(0, 2) || 'CG'}
                  </div>
                )}
              </div>

              {/* Upload Trigger Button Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-900 transition active:scale-95 cursor-pointer"
                title="Unggah Foto Profil Baru"
              >
                <Camera size={18} />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
              {user?.name}
            </h2>
            <div className="text-xs text-slate-500 font-mono font-bold mt-1">
              NIK: {user?.nik || '-'}
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Camera size={13} />
                <span>Ganti Foto</span>
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="btn btn-ghost text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                  title="Hapus Foto"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-3 max-w-xs">
              Gunakan foto formal/kerja dengan format JPG, PNG, atau WEBP (otomatis dioptimalkan sistem).
            </p>
          </div>

          {/* Account Details Box */}
          <div className="card p-5 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Informasi Akun
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <AtSign size={13} />
                  <span>Username</span>
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {user?.username || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Mail size={13} />
                  <span>Email Perusahaan</span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[190px]">
                  {user?.email}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building2 size={13} />
                  <span>Departemen</span>
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[190px]">
                  {user?.department?.name || 'Plant Batam'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>Unit Kerja</span>
                </span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  PT Cemindo Gemilang Tbk
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN (lg:col-span-7): Edit Data & Change Password     */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Data Kontak & Nama */}
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <User size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                  Data Pribadi & Kontak
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nama lengkap dan nomor WhatsApp penerima notifikasi otomatis.
                </p>
              </div>
            </div>

            {profileMessage.text && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : profileMessage.type === 'danger'
                    ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                }`}
              >
                {profileMessage.type === 'success' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="label">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="input text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nomor ini digunakan gateway untuk mengirim reminder meeting 15 menit sebelum rapat.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>{profileSaving ? 'Menyimpan...' : 'Simpan Profil & Foto'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Ganti Password Mandiri */}
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                  Ganti Kata Sandi (Password)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ubah password akun Anda secara berkala untuk menjaga keamanan akses sistem.
                </p>
              </div>
            </div>

            {passwordMessage.text && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="label">Password Saat Ini</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama Anda"
                    className="input text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Password Baru (Min. 6 Karakter)</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru"
                      className="input text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="input text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="btn bg-slate-800 hover:bg-slate-900 text-white text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <Lock size={14} />
                  <span>{passwordSaving ? 'Memproses...' : 'Perbarui Kata Sandi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Ringkasan Hak Akses Anda */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-500" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                  Ringkasan Hak Akses Akun Anda
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                {user?.permissions?.length || 'Default Role'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              {[
                { id: 'menu:dashboard', label: 'Dashboard' },
                { id: 'menu:rooms', label: 'Ruang Meeting' },
                { id: 'menu:calendar', label: 'Kalender' },
                { id: 'menu:bookings_new', label: 'Booking Baru' },
                { id: 'menu:my_bookings', label: 'Booking Saya' },
                { id: 'menu:history', label: 'Riwayat' },
                { id: 'menu:scan_qr', label: 'Scan QR Pintu' },
                { id: 'booking:create', label: 'Buat Reservasi' },
                { id: 'booking:reschedule_own', label: 'Reschedule' },
                { id: 'booking:extend_own', label: 'Perpanjang Durasi' },
                { id: 'booking:cancel_own', label: 'Batal Booking' },
                { id: 'menu:live_monitoring', label: 'Live Monitoring' },
              ].map((item) => {
                const isAllowed = hasPermission(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      isAllowed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                        isAllowed ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-white'
                      }`}
                    >
                      {isAllowed ? <Check size={10} strokeWidth={3} /> : <span className="text-[8px]">-</span>}
                    </div>
                    <span className="font-semibold truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
