import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import CemindoRhinoBadge from '../components/CemindoRhinoBadge';
import CameraQRScanner, { extractCleanToken } from '../components/CameraQRScanner';
import api from '../services/api';
import { QrCode, CheckCircle2, AlertCircle, ArrowLeft, Camera, LogOut, ArrowRight, Calendar } from 'lucide-react';

export default function QRScanCheckin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [qrToken, setQrToken] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleProcessCheckin = async (tokenToUse) => {
    const raw = tokenToUse !== undefined ? tokenToUse : qrToken;
    const token = extractCleanToken(raw);
    if (!token) {
      setError(t('Masukkan atau pindai kode QR Check-in terlebih dahulu.'));
      setErrorDetails(null);
      return;
    }

    setError('');
    setErrorDetails(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/room-usage/checkin', { qrToken: token });
      setResult(res.data.data);
      setShowCamera(false);
    } catch (err) {
      const errData = err.response?.data?.errors || err.response?.data || {};
      const errMsg = err.response?.data?.message || t('Check-in ditolak. Pastikan jadwal meeting sesuai dan belum melewati toleransi 15 menit.');
      setError(errMsg);
      setErrorDetails(errData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handleProcessCheckin(initialCode);
    }
  }, [initialCode]);

  const handleCameraSuccess = (token) => {
    const clean = extractCleanToken(token);
    setQrToken(clean);
    setShowCamera(false);
    handleProcessCheckin(clean);
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-ghost py-1.5 px-3 text-xs">
            <ArrowLeft size={16} />
            <span>{t('Kembali')}</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {t('QR Check-In')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('Pindai QR pada pintu ruangan saat meeting dimulai.')}
            </p>
          </div>
        </div>

        {/* Quick Switch to Check-Out */}
        <Link
          to="/scan/checkout"
          className="btn btn-ghost text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1"
          title={t('Beralih ke QR Check-Out')}
        >
          <span>{t('Ke Check-Out')}</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {result ? (
        <div className="card p-6 border-emerald-500 shadow-md space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">{t('Check-In Berhasil!')}</h2>
            <p className="text-xs text-slate-500">
              {result.room?.name} &bull; {result.room?.location}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('Kode Reservasi')}:</span>
              <strong className="text-slate-800 dark:text-white">{result.booking?.bookingCode}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('Agenda')}:</span>
              <strong className="text-slate-800 dark:text-white">{result.booking?.title}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('Waktu Masuk')}:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                {new Date(result.session?.actualCheckin).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('Status Ruangan')}:</span>
              <span className="inline-block px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-[10px]">
                OCCUPIED
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Link to="/my-bookings" className="btn btn-ghost flex-1 text-xs">
              {t('Booking Saya')}
            </Link>
            <Link to={`/bookings/${result.booking?.id}`} className="btn btn-primary flex-1 text-xs">
              {t('Detail Reservasi')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <div className="flex justify-center pb-1">
            <CemindoRhinoBadge size={52} />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-bold">{t('Check-In Ditolak / Terkendala:')}</div>
                <div className="leading-relaxed">{error}</div>

                {/* Smart Action: User scanned Checkout QR by mistake */}
                {error.includes('Check-Out') && (
                  <button
                    type="button"
                    onClick={() => navigate(`/scan/checkout?code=${qrToken}`)}
                    className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 font-bold shadow-xs mt-1"
                  >
                    <LogOut size={13} />
                    <span>{t('Beralih ke Halaman Check-Out')}</span>
                  </button>
                )}

                {/* Smart Action: Need Reschedule */}
                {(error.includes('Reschedule') || error.includes('toleransi keterlambatan')) && (
                  <Link
                    to="/my-bookings"
                    className="inline-flex items-center gap-1.5 btn btn-xs btn-primary font-bold shadow-xs mt-1"
                  >
                    <Calendar size={13} />
                    <span>{t('Buka Booking Saya untuk Reschedule')}</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Camera Scanner View or Open Camera Button */}
          {showCamera ? (
            <CameraQRScanner
              mode="checkin"
              onScanSuccess={handleCameraSuccess}
              onClose={() => setShowCamera(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 flex flex-col items-center justify-center gap-2 transition group shadow-xs cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Camera size={24} />
              </div>
              <div className="text-center">
                <div className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                  {t('Buka Kamera untuk Scan QR')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Pindai lembar QR di pintu ruangan secara otomatis')}
                </div>
              </div>
            </button>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase">
              {t('atau input manual kode booking / token')}
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessCheckin();
            }}
            className="space-y-3"
          >
            <div className="relative flex items-center">
              <QrCode size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                className="input font-mono text-xs"
                style={{ paddingLeft: '2.75rem' }}
                placeholder={t('Kode Booking (BKG-...) atau Token QR Ruangan')}
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs"
            >
              <QrCode size={16} />
              <span>{loading ? t('Memverifikasi...') : t('Verifikasi Check-In')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
