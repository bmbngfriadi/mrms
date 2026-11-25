import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Clock, Users, MapPin, LogOut, CheckCircle2, X, AlertCircle } from 'lucide-react';

export default function HRGAOverdue() {
  const [overdueSessions, setOverdueSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Checkout Modal
  const [modalSession, setModalSession] = useState(null);
  const [actualEndTime, setActualEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overdueRes, activeRes] = await Promise.all([
        api.get('/room-usage/overdue'),
        api.get('/room-usage/active'),
      ]);
      setOverdueSessions(overdueRes.data.data || []);
      setActiveSessions(activeRes.data.data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualCheckout = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);

    try {
      await api.post('/room-usage/manual-checkout', {
        sessionId: modalSession.id,
        verifiedActualEndTime: actualEndTime ? new Date(actualEndTime).toISOString() : new Date().toISOString(),
        reason,
      });

      setModalSession(null);
      fetchData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Gagal memproses manual checkout.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={24} />
          <span>Sesi Overdue & Manual Checkout</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Penanganan ruangan yang jadwalnya telah berakhir namun belum di-checkout oleh pemesan.
        </p>
      </div>

      {/* Overdue Sessions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Sesi Overdue Saat Ini ({overdueSessions.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Memuat sesi...</div>
        ) : overdueSessions.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-xs">
            Tidak ada ruangan overdue saat ini. Seluruh sesi tertib di-checkout tepat waktu.
          </div>
        ) : (
          <div className="space-y-3">
            {overdueSessions.map((s) => (
              <div
                key={s.id}
                className="card p-4 sm:p-5 border-2 border-amber-400 bg-amber-50/20 dark:bg-amber-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{s.booking?.bookingCode}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[10px]">
                      OVERDUE
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-white">{s.booking?.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Ruangan: <strong className="text-slate-700 dark:text-slate-300">{s.room?.name}</strong> &bull; Pemesan: <strong>{s.booking?.user?.name}</strong> ({s.booking?.user?.department?.name})
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-2">
                    <span>
                      Check-in Aktual: <strong>{new Date(s.actualCheckin).toLocaleTimeString()} WIB</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      Jadwal Berakhir: {new Date(s.booking?.endTime).toLocaleTimeString()} WIB
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalSession(s);
                    setActualEndTime(new Date().toISOString().slice(0, 16));
                    setReason('Peserta rapat telah membubarkan diri namun lupa memindai QR Check-out di pintu.');
                  }}
                  className="btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 px-4 shrink-0 flex items-center gap-1.5"
                >
                  <LogOut size={15} />
                  <span>Manual Checkout</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Sesi Aktif Normal ({activeSessions.length})
        </h2>

        {activeSessions.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-xs">
            Tidak ada sesi meeting yang sedang berjalan saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeSessions.map((s) => (
              <div key={s.id} className="card p-4 space-y-2 border-emerald-400">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {s.room?.name}
                  </span>
                  <StatusBadge status="CHECKED_IN" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{s.booking?.title}</h4>
                <div className="text-xs text-slate-500">
                  Pemesan: {s.booking?.user?.name} &bull; Check-in: {new Date(s.actualCheckin).toLocaleTimeString()} WIB
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Manual Checkout HRGA</h3>
                <p className="text-xs text-slate-400">{modalSession.room?.name} &bull; {modalSession.booking?.bookingCode}</p>
              </div>
              <button onClick={() => setModalSession(null)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleManualCheckout} className="space-y-3.5">
              <div>
                <label className="label">Waktu Selesai Aktual Terverifikasi</label>
                <input
                  type="datetime-local"
                  required
                  className="input text-xs font-bold"
                  value={actualEndTime}
                  onChange={(e) => setActualEndTime(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Alasan Manual Checkout (Wajib Diisi)</label>
                <textarea
                  rows="3"
                  required
                  className="input text-xs resize-none py-2"
                  placeholder="Input alasan checkout manual"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalSession(null)} className="btn btn-ghost text-xs">
                  Batal
                </button>
                <button type="submit" disabled={actionLoading} className="btn bg-amber-600 text-white text-xs px-4">
                  {actionLoading ? 'Memproses...' : 'Tutup Sesi Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
