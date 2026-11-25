import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import {
  Activity,
  DoorOpen,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogOut,
  X,
  AlertCircle,
} from 'lucide-react';

export default function HRGALiveMonitoring() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual Checkout Modal
  const [manualCheckoutTarget, setManualCheckoutTarget] = useState(null);
  const [actualEndTime, setActualEndTime] = useState('');
  const [checkoutReason, setCheckoutReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLiveRooms = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data || []);
    } catch (err) {
      console.error('Failed to load live rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveRooms();
    const interval = setInterval(() => fetchLiveRooms(), 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  const handleManualCheckoutSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);

    try {
      await api.post('/room-usage/manual-checkout', {
        sessionId: manualCheckoutTarget.activeSession.id,
        verifiedActualEndTime: actualEndTime ? new Date(actualEndTime).toISOString() : new Date().toISOString(),
        reason: checkoutReason,
      });
      setManualCheckoutTarget(null);
      fetchLiveRooms();
    } catch (err) {
      setActionError(err.response?.data?.message || t('Gagal memproses manual checkout.'));
    } finally {
      setActionLoading(false);
    }
  };

  const occupiedCount = rooms.filter((r) => r.currentStatus === 'OCCUPIED').length;
  const overdueCount = rooms.filter((r) => r.currentStatus === 'OVERDUE').length;
  const availableCount = rooms.filter((r) => r.currentStatus === 'AVAILABLE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Activity size={13} className="text-brand-500 animate-pulse" />
            <span>HRGA Live Operations Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('Live Room Monitoring')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Pemantauan langsung status okupansi ruangan di Plant Batam secara real-time.')}
          </p>
        </div>

        <button
          onClick={() => fetchLiveRooms(true)}
          className="btn btn-ghost text-xs self-start sm:self-auto flex items-center gap-2"
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{t('Segarkan')}</span>
        </button>
      </div>

      {/* Live Status Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-slate-400 uppercase">{t('Tersedia')} (Ready)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{availableCount}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-bold text-slate-400 uppercase">{t('Sedang Digunakan')} (Occupied)</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{occupiedCount}</div>
        </div>
        <div className={`card p-4 border-l-4 border-l-amber-500 ${overdueCount > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
          <div className="text-xs font-bold text-slate-400 uppercase">{t('Melebihi Jadwal')} (Overdue)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{overdueCount}</div>
        </div>
      </div>

      {/* Live Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => {
          const isOccupied = room.currentStatus === 'OCCUPIED';
          const isOverdue = room.currentStatus === 'OVERDUE';
          const session = room.activeSession;

          return (
            <div
              key={room.id}
              className={`card p-5 space-y-4 border-2 transition-all ${isOverdue
                  ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/10'
                  : isOccupied
                    ? 'border-rose-400 bg-rose-50/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{room.code}</span>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">{room.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <MapPin size={12} />
                    <span>{room.location} &bull; {t('Kapasitas')}: {room.capacity} {t('orang')}</span>
                  </div>
                </div>
                <StatusBadge status={room.currentStatus} type="room" />
              </div>

              {/* Active / Overdue Session Details */}
              {(isOccupied || isOverdue) && session ? (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{session.booking?.title}</div>
                      <div className="text-slate-500 text-[11px]">
                        {t('Pemesan')}: <strong>{session.user?.name}</strong> ({session.user?.department?.name})
                      </div>
                    </div>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[10px] animate-pulse">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      {t('Waktu Masuk')}: <strong className="text-emerald-600">{new Date(session.actualCheckin).toLocaleTimeString()} WIB</strong>
                    </div>
                    <div>
                      {t('Jadwal Selesai')}: <strong className="text-rose-600">{new Date(session.booking?.endTime).toLocaleTimeString()} WIB</strong>
                    </div>
                  </div>

                  {/* Manual Checkout Button for HRGA */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setManualCheckoutTarget(room);
                        setActualEndTime(new Date().toISOString().slice(0, 16));
                        setCheckoutReason('');
                      }}
                      className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <LogOut size={13} />
                      <span>{t('Manual Checkout')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center text-xs text-slate-400">
                  {t('Ruangan saat ini dalam kondisi bebas dan siap digunakan.')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* HRGA MANUAL CHECKOUT MODAL - Placeholder-Free                  */}
      {/* ============================================================== */}
      {manualCheckoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  {t('Manual Checkout')}
                </h3>
                <p className="text-xs text-slate-400">
                  {manualCheckoutTarget.name} &bull; HRGA Intervention
                </p>
              </div>
              <button
                onClick={() => setManualCheckoutTarget(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleManualCheckoutSubmit} className="space-y-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                {t('Tindakan ini akan melepaskan status OCCUPIED ruangan menjadi AVAILABLE.')}
              </div>

              <div>
                <label className="label">{t('Waktu Selesai')}</label>
                <input
                  type="datetime-local"
                  required
                  className="input text-xs font-bold"
                  value={actualEndTime}
                  onChange={(e) => setActualEndTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Alasan')}</label>
                <textarea
                  rows="3"
                  required
                  className="input text-xs resize-none py-2"
                  value={checkoutReason}
                  onChange={(e) => setCheckoutReason(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualCheckoutTarget(null)}
                  className="btn btn-ghost text-xs"
                >
                  {t('Batal')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs px-4"
                >
                  {actionLoading ? t('Memproses...') : t('Konfirmasi Manual Checkout')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
