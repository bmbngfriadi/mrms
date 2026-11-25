import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  DoorOpen,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  History,
  QrCode,
  ArrowLeft,
} from 'lucide-react';

export default function BookingDetail() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${id}`);
        setBooking(res.data.data);
      } catch (err) {
        console.error('Failed to load booking:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-slate-400">{t('Memuat detail reservasi...')}</div>;
  }

  if (!booking) {
    return <div className="card p-12 text-center text-slate-400">{t('Reservasi tidak ditemukan.')}</div>;
  }

  const { room, user, usageSession, history = [] } = booking;
  const locale = lang === 'en' ? 'en-US' : 'id-ID';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/my-bookings" className="btn btn-ghost py-1.5 px-3 text-xs shrink-0">
          <ArrowLeft size={16} />
          <span>{t('Kembali')}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 block">{booking.bookingCode}</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white break-words">{booking.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details & Timelines */}
        <div className="md:col-span-2 space-y-5">
          {/* Planned vs Actual Timeline Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-brand-500" />
                <span>{t('Perbandingan Waktu Rencana vs Aktual')}</span>
              </h3>
              <StatusBadge status={booking.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Planned Schedule */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  {t('Jadwal Rencana (Planned)')}
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {new Date(booking.startTime).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-sm font-black text-brand-600 dark:text-brand-400">
                  {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {t('Durasi')}: {Math.round((new Date(booking.endTime) - new Date(booking.startTime)) / 60000)} {t('menit')}
                </div>
              </div>

              {/* Actual Usage */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  {t('Penggunaan Aktual (Actual)')}
                </div>
                {usageSession ? (
                  <div className="space-y-1">
                    <div className="text-xs">
                      {t('Check-in')}: <strong className="text-emerald-600 dark:text-emerald-400">{new Date(usageSession.actualCheckin).toLocaleTimeString()} WIB</strong>
                    </div>
                    <div className="text-xs">
                      {t('Check-out')}:{' '}
                      {usageSession.actualCheckout ? (
                        <strong className="text-slate-700 dark:text-slate-200">
                          {new Date(usageSession.actualCheckout).toLocaleTimeString()} WIB
                        </strong>
                      ) : (
                        <span className="text-amber-500 font-bold">{t('Sedang Aktif (Belum Selesai)')}</span>
                      )}
                    </div>
                    {usageSession.isManualCheckout && (
                      <div className="text-[11px] p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 mt-1">
                        <strong>{t('Manual Checkout')}:</strong> {usageSession.manualCheckoutReason} ({t('Petugas')}: {usageSession.manualCheckoutUser?.name})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-2">
                    {t('Belum ada sesi aktual. Check-in dilakukan di pintu ruangan.')}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-2">
              {booking.status === 'CONFIRMED' && (
                <Link to="/scan/checkin" className="btn btn-primary text-xs py-2 px-4">
                  <QrCode size={16} />
                  <span>Scan QR Check-In</span>
                </Link>
              )}
              {booking.status === 'CHECKED_IN' && (
                <Link to="/scan/checkout" className="btn bg-rose-600 text-white text-xs py-2 px-4">
                  <QrCode size={16} />
                  <span>Scan QR Check-Out</span>
                </Link>
              )}
            </div>
          </div>

          {/* Booking History & Audit Trail */}
          <div className="card p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <History size={16} className="text-brand-500" />
              <span>{t('Riwayat Aktivitas & Audit Trail')}</span>
            </h3>

            {history.length === 0 ? (
              <div className="text-xs text-slate-400 py-3">{t('Belum ada catatan riwayat.')}</div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {history.map((h) => (
                  <div key={h.id} className="relative text-xs">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>{t(h.action)}</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        {new Date(h.createdAt).toLocaleString(locale)}
                      </span>
                    </div>
                    {h.reason && <p className="text-slate-600 dark:text-slate-400 mt-0.5">{h.reason}</p>}
                    {h.actor && (
                      <span className="text-[11px] text-slate-400">{t('Oleh')}: {h.actor.name} ({h.actor.role})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Booker & Room Summary */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Ruangan Dipilih')}</div>
            <div className="font-bold text-sm text-slate-800 dark:text-white">{room.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0" />
              <span>{room.location}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Users size={13} className="shrink-0" />
              <span>{t('Kapasitas')}: {room.capacity} {t('Orang')}</span>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Informasi Pemesan')}</div>
            <div className="font-bold text-sm text-slate-800 dark:text-white">{user.name}</div>
            <div className="text-xs text-slate-500">NIK: {user.nik || '-'}</div>
            <div className="text-xs text-slate-500">{t('Departemen')}: {user.department?.name}</div>
            <div className="text-xs text-slate-500">WhatsApp: {user.phone}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
