import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import CemindoRhinoBadge from '../components/CemindoRhinoBadge';
import CameraQRScanner, { extractCleanToken } from '../components/CameraQRScanner';
import api from '../services/api';
import { QrCode, CheckCircle2, AlertCircle, ArrowLeft, Camera, LogOut, ArrowRight, Calendar, DoorOpen, Clock, User } from 'lucide-react';

export default function QRScanCheckin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [qrToken, setQrToken] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handlePreviewCheckin = async (tokenToUse) => {
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
    setPreviewData(null);
    setResult(null);

    try {
      const res = await api.post('/room-usage/checkin/preview', { qrToken: token });
      const data = res.data.data;
      setShowCamera(false);
      if (data?.alreadyCheckedIn) {
        setResult(data);
      } else {
        setPreviewData({ ...data, qrToken: token });
      }
    } catch (err) {
      const errData = err.response?.data?.errors || err.response?.data || {};
      const errMsg = err.response?.data?.message || t('Check-in ditolak. Pastikan jadwal meeting sesuai dan belum melewati toleransi 15 menit.');
      setError(errMsg);
      setErrorDetails(errData);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!previewData?.qrToken) return;

    setError('');
    setErrorDetails(null);
    setConfirming(true);

    try {
      const res = await api.post('/room-usage/checkin', {
        qrToken: previewData.qrToken,
        bookingId: previewData.booking?.id,
      });
      setResult(res.data.data);
      setPreviewData(null);
    } catch (err) {
      const errData = err.response?.data?.errors || err.response?.data || {};
      const errMsg = err.response?.data?.message || t('Check-in ditolak. Pastikan jadwal meeting sesuai dan belum melewati toleransi 15 menit.');
      setError(errMsg);
      setErrorDetails(errData);
      setPreviewData(null);
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handlePreviewCheckin(initialCode);
    }
  }, [initialCode]);

  const handleCameraSuccess = (token) => {
    const clean = extractCleanToken(token);
    setQrToken(clean);
    setShowCamera(false);
    handlePreviewCheckin(clean);
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

          {/* Quick Switch to Check-Out */}
          <Link
            to="/scan/checkout"
            className="btn btn-ghost py-1.5 px-3 text-xs text-rose-600 dark:text-rose-400 font-bold shrink-0 whitespace-nowrap"
            title={t('Beralih ke QR Check-Out')}
          >
            <span>{t('Ke Check-Out')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('QR Check-In')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('Pindai QR pada pintu ruangan saat meeting dimulai.')}
          </p>
        </div>
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
      ) : previewData?.requiresSelection ? (
        <div className="card p-6 border-brand-500/50 shadow-md space-y-4 animate-in zoom-in-95">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 border border-brand-200 dark:border-brand-800 flex items-center justify-center mx-auto">
              <Calendar size={24} />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
              {t('Pilih Agenda Meeting untuk Check-In')}
            </h2>
            <p className="text-xs text-slate-500">
              {previewData.room?.name} &bull; {t('Terdapat beberapa jadwal reservasi hari ini. Pilih agenda yang akan dimulai sekarang:')}
            </p>
          </div>

          <div className="space-y-2.5">
            {(previewData.bookings || []).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  setPreviewData({
                    room: previewData.room,
                    booking: b,
                    qrToken: previewData.qrToken,
                    requiresSelection: false,
                  })
                }
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400">
                    {b.bookingCode}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {new Date(b.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} –{' '}
                    {new Date(b.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-white">{b.title}</div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{b.user?.name} ({b.user?.department?.name || '-'})</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    {t('Pilih')} <ArrowRight size={12} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setPreviewData(null);
              setQrToken('');
              navigate('/scan/checkin', { replace: true });
            }}
            className="w-full btn btn-ghost text-xs"
          >
            {t('Batal / Scan QR Lain')}
          </button>
        </div>
      ) : previewData ? (
        <div className="card p-6 border-emerald-500/60 shadow-md space-y-5 animate-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <DoorOpen size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              {t('Konfirmasi Check-In Ruangan')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('Pastikan detail reservasi di bawah ini sudah sesuai sebelum melakukan check-in.')}
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
              <span className="text-slate-500 shrink-0">{t('Jadwal')}:</span>
              <span className="font-bold text-slate-800 dark:text-white text-right flex items-center gap-1">
                <Clock size={13} className="text-emerald-600" />
                {new Date(previewData.booking?.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} –{' '}
                {new Date(previewData.booking?.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
              </span>
            </div>
            {previewData.booking?.notes && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-500 block mb-0.5">{t('Catatan / Kebutuhan')}:</span>
                {previewData.booking.notes}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleConfirmCheckin}
              disabled={confirming}
              className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black py-3 shadow-sm"
            >
              <CheckCircle2 size={18} />
              <span>{confirming ? t('Memproses Check-In...') : t('Konfirmasi Check-In Sekarang')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewData(null);
                setQrToken('');
                navigate('/scan/checkin', { replace: true });
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
              handlePreviewCheckin();
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
