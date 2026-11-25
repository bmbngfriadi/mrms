import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import CemindoRhinoBadge from '../components/CemindoRhinoBadge';
import CameraQRScanner, { extractCleanToken } from '../components/CameraQRScanner';
import api from '../services/api';
import { QrCode, CheckCircle2, AlertCircle, ArrowLeft, Camera, LogIn, ArrowRight, DoorOpen, Clock, User } from 'lucide-react';

export default function QRScanCheckout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [qrToken, setQrToken] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handlePreviewCheckout = async (tokenToUse) => {
    const raw = tokenToUse !== undefined ? tokenToUse : qrToken;
    const token = extractCleanToken(raw);
    if (!token) {
      setError(t('Masukkan atau pindai kode QR Check-out terlebih dahulu.'));
      return;
    }

    setError('');
    setLoading(true);
    setPreviewData(null);
    setResult(null);

    try {
      const res = await api.post('/room-usage/checkout/preview', { qrToken: token });
      const data = res.data.data;
      setShowCamera(false);
      if (data?.alreadyCheckedOut) {
        setResult(data);
      } else {
        setPreviewData({ ...data, qrToken: token });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t('Check-out gagal. Pastikan QR valid dan terdapat sesi rapat aktif di ruangan ini.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!previewData?.qrToken) return;

    setError('');
    setConfirming(true);

    try {
      const res = await api.post('/room-usage/checkout', {
        qrToken: previewData.qrToken,
        bookingId: previewData.booking?.id,
      });
      setResult(res.data.data);
      setPreviewData(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t('Check-out gagal. Pastikan QR valid dan terdapat sesi rapat aktif di ruangan ini.')
      );
      setPreviewData(null);
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handlePreviewCheckout(initialCode);
    }
  }, [initialCode]);

  const handleCameraSuccess = (token) => {
    const clean = extractCleanToken(token);
    setQrToken(clean);
    setShowCamera(false);
    handlePreviewCheckout(clean);
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header & Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="btn btn-ghost py-1.5 px-3 text-xs shrink-0 whitespace-nowrap">
            <ArrowLeft size={16} />
            <span>{t('Kembali')}</span>
          </Link>

          {/* Quick Switch to Check-In */}
          <Link
            to="/scan/checkin"
            className="btn btn-ghost py-1.5 px-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0 whitespace-nowrap"
            title={t('Beralih ke QR Check-In')}
          >
            <span>{t('Ke Check-In')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('QR Check-Out')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('Pindai QR keluar saat selesai menggunakan ruangan meeting.')}
          </p>
        </div>
      </div>

      {result ? (
        <div className="card p-6 border-rose-500 shadow-md space-y-4 animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">{t('Check-Out Berhasil!')}</h2>
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
              <span className="text-slate-500">{t('Waktu Selesai')}:</span>
              <strong className="text-rose-600 dark:text-rose-400">
                {new Date(result.session?.actualCheckout).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('Status Ruangan')}:</span>
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-500 text-white font-bold text-[10px]">
                AVAILABLE
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Link to="/rooms" className="btn btn-ghost flex-1 text-xs">
              {t('Ruangan')}
            </Link>
            <Link to={`/bookings/${result.booking?.id}`} className="btn btn-primary flex-1 text-xs">
              {t('Detail Reservasi')}
            </Link>
          </div>
        </div>
      ) : previewData ? (
        <div className="card p-6 border-rose-500/60 shadow-md space-y-5 animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <DoorOpen size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              {t('Konfirmasi Check-Out Ruangan')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('Pastikan rapat telah selesai dan ruangan rapi sebelum melakukan check-out.')}
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">{t('Ruangan')}:</span>
              <strong className="text-slate-800 dark:text-white text-right">
                {previewData.room?.name} ({previewData.room?.location})
              </strong>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">{t('Kode Reservasi')}:</span>
              <strong className="font-mono text-brand-600 dark:text-brand-400 text-right">
                {previewData.booking?.bookingCode}
              </strong>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">{t('Agenda')}:</span>
              <strong className="text-slate-800 dark:text-white text-right">
                {previewData.booking?.title}
              </strong>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">{t('Pemesan')}:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-right flex items-center gap-1">
                <User size={13} className="text-slate-400" />
                {previewData.booking?.user?.name}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0">{t('Waktu Masuk')}:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right flex items-center gap-1">
                <Clock size={13} />
                {previewData.session?.actualCheckin
                  ? `${new Date(previewData.session.actualCheckin).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                  : '-'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConfirmCheckout}
              disabled={confirming}
              className="w-full btn bg-rose-600 hover:bg-rose-700 text-white text-sm font-black py-3 shadow-sm"
            >
              <CheckCircle2 size={18} />
              <span>{confirming ? t('Memproses Check-Out...') : t('Konfirmasi Check-Out Sekarang')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewData(null);
                setQrToken('');
                navigate('/scan/checkout', { replace: true });
              }}
              disabled={confirming}
              className="w-full btn btn-ghost text-xs"
            >
              {t('Batal / Scan QR Lain')}
            </button>
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
                <div className="font-bold">{t('Check-Out Ditolak / Terkendala:')}</div>
                <div className="leading-relaxed">{error}</div>

                {/* Smart Action: User scanned Checkin QR by mistake */}
                {error.includes('Check-In') && (
                  <button
                    type="button"
                    onClick={() => navigate(`/scan/checkin?code=${qrToken}`)}
                    className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold shadow-xs mt-1"
                  >
                    <LogIn size={13} />
                    <span>{t('Beralih ke Halaman Check-In')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Camera Scanner View or Open Camera Button */}
          {showCamera ? (
            <CameraQRScanner
              mode="checkout"
              onScanSuccess={handleCameraSuccess}
              onClose={() => setShowCamera(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-rose-800 dark:text-rose-200 flex flex-col items-center justify-center gap-2 transition group shadow-xs cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Camera size={24} />
              </div>
              <div className="text-center">
                <div className="font-black text-sm text-rose-700 dark:text-rose-300">
                  {t('Buka Kamera untuk Scan QR')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Pindai lembar QR keluar di pintu ruangan secara otomatis')}
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
              handlePreviewCheckout();
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
              className="w-full btn bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs"
            >
              <QrCode size={16} />
              <span>{loading ? t('Memverifikasi...') : t('Verifikasi Check-Out')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
