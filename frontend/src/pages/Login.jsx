import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import CemindoRhinoBadge from '../components/CemindoRhinoBadge';
import api from '../services/api';
import {
  LogIn,
  AlertCircle,
  Sun,
  Moon,
  ShieldCheck,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Mail,
  User,
  Phone,
  HelpCircle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AtSign,
  IdCard,
} from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState('ALL'); // 'ALL' | 'USERNAME' | 'EMAIL' | 'NIK' | 'PHONE'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Self-Service Forgot Password Modal States
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Request OTP, 2: Verify & Reset, 3: Success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  const { login, theme, toggleTheme } = useAuth();
  const { lang, toggleLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      const from = location.state?.from
        ? `${location.state.from.pathname}${location.state.from.search || ''}`
        : '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (lang === 'en'
            ? 'Sign in failed. Check your credentials and password.'
            : 'Login gagal. Periksa data login dan kata sandi Anda.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Dynamic label based on selected tab
  const getIdentifierLabel = () => {
    switch (authMethod) {
      case 'USERNAME':
        return t('Username Akun');
      case 'EMAIL':
        return t('Email Perusahaan (@cemindogemilang.com)');
      case 'NIK':
        return t('NIK Karyawan');
      case 'PHONE':
        return t('Nomor WhatsApp');
      case 'ALL':
      default:
        return t('Email / Username / NIK / No. HP');
    }
  };

  const getInputType = () => {
    if (authMethod === 'EMAIL') return 'email';
    if (authMethod === 'PHONE') return 'tel';
    return 'text';
  };

  const getIdentifierIcon = () => {
    switch (authMethod) {
      case 'USERNAME':
        return <User size={16} className="text-slate-400 shrink-0" />;
      case 'EMAIL':
        return <Mail size={16} className="text-slate-400 shrink-0" />;
      case 'NIK':
        return <IdCard size={16} className="text-slate-400 shrink-0" />;
      case 'PHONE':
        return <Phone size={16} className="text-slate-400 shrink-0" />;
      case 'ALL':
      default:
        return <KeyRound size={16} className="text-slate-400 shrink-0" />;
    }
  };

  // Open Forgot Password Modal
  const openForgotModal = () => {
    setForgotStep(1);
    setForgotIdentifier(identifier || '');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotMaskedPhone('');
    setForgotError('');
    setForgotSuccessMsg('');
    setForgotModal(true);
  };

  // Step 1: Request OTP via WhatsApp
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot-password/request-otp', {
        identifier: forgotIdentifier,
      });
      setForgotMaskedPhone(res.data.data?.maskedPhone || '');
      setForgotSuccessMsg(res.data.message || 'OTP berhasil dikirim ke WhatsApp.');
      setForgotStep(2);
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
          'Gagal mengirim kode OTP. Pastikan identitas terdaftar dan memiliki nomor WhatsApp aktif.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (forgotNewPassword.length < 6) {
      setForgotError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot-password/verify-and-reset', {
        identifier: forgotIdentifier,
        otpCode: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });

      setForgotSuccessMsg(res.data.message || 'Kata sandi berhasil diperbarui.');
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Kode OTP salah atau telah kedaluwarsa.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Complete and Return to Login
  const handleCompleteReset = () => {
    setIdentifier(forgotIdentifier);
    setPassword('');
    setForgotModal(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] dark:bg-slate-950 font-sans">
      {/* ============================================================== */}
      {/* DESKTOP-ONLY LEFT SIDE: CEMINDO CORPORATE BRAND HERO PANEL     */}
      {/* ============================================================== */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#b52025] via-[#a31a1f] to-[#7a0f13] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Decorative Background Geometry */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-10 right-0 w-80 h-80 rounded-full bg-black/10 pointer-events-none" />

        {/* Top Brand Logo & Unit */}
        <div className="relative z-10 flex items-center gap-3">
          <CemindoRhinoBadge size={48} className="border-0 shadow-none bg-white" />
          <div>
            <div className="text-sm font-black tracking-wider uppercase leading-none">
              PT CEMINDO GEMILANG Tbk
            </div>
            <div className="text-xs opacity-90 mt-1">
              Plant Batam &bull; Kepulauan Riau
            </div>
          </div>
        </div>

        {/* Center Main Headline & Description */}
        <div className="relative z-10 my-auto max-w-lg space-y-4 py-12">
          <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight">
            Meeting Room Management System
          </h1>
          <p className="text-sm text-red-100/90 leading-relaxed">
            {t(
              'Platform operasional gerbang industri untuk reservasi ruang meeting mandiri, pemantauan utilisasi ruangan secara real-time, dan integrasi QR Check-in/Check-out.'
            )}
          </p>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/15 border border-white/10 text-xs font-semibold text-white">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>{t('Sistem Otentikasi Terintegrasi WhatsApp Gateway & Audit Log')}</span>
            </div>
          </div>
        </div>

        {/* Bottom Left Copyright */}
        <div className="relative z-10 text-xs opacity-75">
          &copy; {new Date().getFullYear()} PT Cemindo Gemilang Tbk &bull; Plant Batam
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT SIDE / MOBILE FULL-SCREEN LOGIN FORM                     */}
      {/* ============================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-4 sm:p-8 lg:p-12 bg-white dark:bg-slate-950">
        {/* Top Header Utilities: [ 🌐 ID ] [ 🌙 ] */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold transition-colors bg-white dark:bg-slate-900 shadow-xs"
            title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          >
            <Globe size={14} className="text-slate-600 dark:text-slate-400" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors bg-white dark:bg-slate-900 shadow-xs"
            title="Ganti Mode Gelap / Terang"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Center Content: Mobile Card Container */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-4 space-y-5">
          {/* Centered Brand Emblem (Mobile Reference) */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <CemindoRhinoBadge size={58} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 dark:text-white uppercase">
                PT CEMINDO GEMILANG Tbk
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Meeting Room Management &bull; Plant Batam
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="text-left pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('Masuk ke sistem')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Gunakan akun internal yang telah terdaftar.')}
            </p>
          </div>

          {/* Tab Selector / Segmented Control with 5 options (Semua, Username, Email, NIK, WhatsApp) */}
          <div className="bg-[#f1f5f9] dark:bg-slate-900 p-1 rounded-2xl grid grid-cols-5 gap-1 border border-slate-200/80 dark:border-slate-800 text-xs">
            {[
              { id: 'ALL', label: t('Semua') },
              { id: 'USERNAME', label: 'Username' },
              { id: 'EMAIL', label: 'Email' },
              { id: 'NIK', label: 'NIK' },
              { id: 'PHONE', label: 'WhatsApp' },
            ].map((tab) => {
              const active = authMethod === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAuthMethod(tab.id)}
                  className={`h-9 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40'
                  }`}
                >
                  <span className="leading-none text-[11px] sm:text-xs font-bold text-center truncate">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input 1: Identifier Field with Icon inside, NO PLACEHOLDER */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {getIdentifierLabel()}
              </label>
              <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                {getIdentifierIcon()}
                <input
                  type={getInputType()}
                  required
                  className="w-full bg-transparent pl-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Input 2: Password Field with Dots & Eye Toggle, NO PLACEHOLDER */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('Kata Sandi')}
              </label>
              <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                <span className="text-slate-400 select-none text-xs">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full bg-transparent pl-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right pt-0.5">
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="text-[11px] font-bold text-[#b52025] hover:underline cursor-pointer"
                >
                  {t('Lupa kata sandi akun Anda?')}
                </button>
              </div>
            </div>

            {/* Submit Button (Full Width Red Button) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#b52025] hover:bg-[#9d1b20] active:scale-[0.99] text-white font-bold text-xs sm:text-sm py-3 px-4 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn size={16} />
                <span>{loading ? t('Memverifikasi...') : t('Masuk ke Sistem')}</span>
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="border-t border-slate-200/80 dark:border-slate-800 my-4" />

          {/* Direct Action Link */}
          <div className="text-center">
            <Link
              to="/scan/checkin"
              className="text-xs font-bold text-[#b52025] hover:underline inline-flex items-center gap-1"
            >
              <span>{t('Pindai QR langsung di pintu ruangan')} &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Bottom Centered Footer */}
        <div className="pt-6 text-center text-[11px] text-slate-400">
          Meeting Room Management System &bull; PT Cemindo Gemilang Tbk
        </div>
      </div>

      {/* ============================================================== */}
      {/* SELF-SERVICE RESET PASSWORD MODAL (WHATSAPP OTP BASED)         */}
      {/* ============================================================== */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#b52025] flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    {t('Reset Kata Sandi Mandiri')}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Otentikasi OTP melalui WhatsApp Resmi
                  </div>
                </div>
              </div>
              <button
                onClick={() => setForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Request WhatsApp OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(
                    'Masukkan Username, Email Perusahaan, NIK, atau Nomor WhatsApp Anda yang telah terdaftar. Kami akan mengirimkan 6 digit kode OTP ke WhatsApp Anda.'
                  )}
                </p>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('Identitas Akun (Username / Email / NIK / WhatsApp)')}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                    <User size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      className="w-full bg-transparent pl-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Bantuan Operasional HRGA Plant Batam:
                  </div>
                  <div>&bull; Kontak WhatsApp: <strong>0812-7000-0101</strong></div>
                  <div>&bull; Ekstensi Kantor: <strong>ext. 102 / 103</strong></div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="btn btn-ghost text-xs py-2 px-3.5"
                  >
                    {t('Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    className="btn bg-[#b52025] hover:bg-[#9d1b20] text-white text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{forgotLoading ? t('Mengirim OTP...') : t('Kirim Kode OTP ke WhatsApp')}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Input OTP & Set New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{t('Kode OTP Terkirim')}</div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      {t('Kode 6-digit telah dikirimkan ke WhatsApp')} <strong>{forgotMaskedPhone}</strong>. {t('Masa berlaku: 10 menit.')}
                    </div>
                  </div>
                </div>

                {/* OTP Input */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('Masukkan 6 Digit Kode OTP')}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                    <KeyRound size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      className="w-full bg-transparent pl-2.5 text-center font-mono font-black text-lg tracking-[0.4em] text-slate-900 dark:text-white outline-none"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      autoFocus
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('Kata Sandi Baru (Min. 6 Karakter)')}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                    <span className="text-slate-400 select-none text-xs">🔒</span>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="w-full bg-transparent pl-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium tracking-wider"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      tabIndex={-1}
                    >
                      {showForgotNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('Ulangi Kata Sandi Baru')}
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all pl-3.5 pr-3 py-2.5">
                    <span className="text-slate-400 select-none text-xs">🔒</span>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="w-full bg-transparent pl-2.5 pr-8 text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium tracking-wider"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    <span>{t('Ganti Identitas')}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={forgotLoading}
                      className="btn btn-ghost text-xs py-2 px-2.5 flex items-center gap-1"
                      title="Kirim ulang OTP"
                    >
                      <RotateCcw size={13} className={forgotLoading ? 'animate-spin' : ''} />
                      <span>{t('Kirim Ulang')}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotOtp.length < 6 || !forgotNewPassword}
                      className="btn bg-[#b52025] hover:bg-[#9d1b20] text-white text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{forgotLoading ? t('Menyimpan...') : t('Simpan Kata Sandi')}</span>
                      <CheckCircle2 size={15} />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {forgotStep === 3 && (
              <div className="space-y-4 py-3 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-slate-800 dark:text-white text-base">
                    {t('Kata Sandi Berhasil Diperbarui!')}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {t(
                      'Akun Anda kini telah diperbarui. Silakan masuk menggunakan kata sandi baru yang baru saja Anda buat.'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteReset}
                  className="w-full btn bg-[#b52025] hover:bg-[#9d1b20] text-white text-xs sm:text-sm py-2.5 font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <LogIn size={16} />
                  <span>{t('Kembali ke Halaman Login & Masuk')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
