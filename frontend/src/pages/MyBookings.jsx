import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  MoreVertical,
  X,
  AlertCircle,
  PlusCircle,
  QrCode,
  Edit2,
  Trash2,
  Sliders,
  ShieldCheck,
  Search,
  CheckCircle2,
  Users,
} from 'lucide-react';

export default function MyBookings() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { t } = useI18n();

  const canAdminEdit = isAdmin || hasPermission('booking:edit_any');
  const canAdminDelete = isAdmin || hasPermission('booking:delete_any');

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL');
  const [search, setSearch] = useState('');

  // User Self-Service Modals
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [extendTarget, setExtendTarget] = useState(null);
  const [extendMinutes, setExtendMinutes] = useState(30);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Admin Direct Edit Modal State
  const [adminEditTarget, setAdminEditTarget] = useState(null);
  const [adminEditTitle, setAdminEditTitle] = useState('');
  const [adminEditRoomId, setAdminEditRoomId] = useState('');
  const [adminEditStartTime, setAdminEditStartTime] = useState('');
  const [adminEditEndTime, setAdminEditEndTime] = useState('');
  const [adminEditMeetingType, setAdminEditMeetingType] = useState('INTERNAL');
  const [adminEditAttendeesCount, setAdminEditAttendeesCount] = useState(1);
  const [adminEditNotes, setAdminEditNotes] = useState('');
  const [adminEditStatus, setAdminEditStatus] = useState('CONFIRMED');
  const [adminEditReason, setAdminEditReason] = useState('');
  const [adminEditNote, setAdminEditNote] = useState('');
  const [adminEditLoading, setAdminEditLoading] = useState(false);
  const [adminEditError, setAdminEditError] = useState('');

  // Admin Direct Delete Modal State
  const [adminDeleteTarget, setAdminDeleteTarget] = useState(null);
  const [adminDeleteReason, setAdminDeleteReason] = useState('');
  const [adminDeleteLoading, setAdminDeleteLoading] = useState(false);
  const [adminDeleteError, setAdminDeleteError] = useState('');

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/bookings?myOnly=true&limit=100'),
        api.get('/rooms'),
      ]);
      setBookings(bRes.data.data || []);
      setRooms(rRes.data.data || []);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  // Filtered List
  const filtered = bookings.filter((b) => {
    // Tab Filter
    if (filterTab === 'UPCOMING' && b.status !== 'CONFIRMED' && b.status !== 'NO_SHOW_PENDING') return false;
    if (filterTab === 'ACTIVE' && b.status !== 'CHECKED_IN') return false;
    if (filterTab === 'COMPLETED' && b.status !== 'COMPLETED') return false;
    if (filterTab === 'CANCELLED' && b.status !== 'CANCELLED') return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = b.bookingCode?.toLowerCase().includes(q);
      const titleMatch = b.title?.toLowerCase().includes(q);
      const roomMatch = b.room?.name?.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !roomMatch) return false;
    }

    return true;
  });

  // Action Handlers for Reschedule, Extend, Cancel
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await api.put(`/bookings/${rescheduleTarget.id}/reschedule`, {
        startTime: new Date(rescheduleStart).toISOString(),
        endTime: new Date(rescheduleEnd).toISOString(),
        reason: rescheduleReason,
      });
      setRescheduleTarget(null);
      fetchMyBookings();
    } catch (err) {
      setActionError(err.response?.data?.message || t('Gagal reschedule booking.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await api.post(`/bookings/${extendTarget.id}/extend`, {
        additionalMinutes: parseInt(extendMinutes, 10),
      });
      setExtendTarget(null);
      fetchMyBookings();
    } catch (err) {
      setActionError(err.response?.data?.message || t('Gagal memperpanjang waktu booking.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`, {
        reason: cancelReason,
      });
      setCancelTarget(null);
      fetchMyBookings();
    } catch (err) {
      setActionError(err.response?.data?.message || t('Gagal membatalkan booking.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Admin Direct Edit
  const openAdminEdit = (b) => {
    setAdminEditTarget(b);
    setAdminEditTitle(b.title || '');
    setAdminEditRoomId(b.roomId || '');
    setAdminEditStartTime(new Date(b.startTime).toISOString().slice(0, 16));
    setAdminEditEndTime(new Date(b.endTime).toISOString().slice(0, 16));
    setAdminEditMeetingType(b.meetingType || 'INTERNAL');
    setAdminEditAttendeesCount(b.attendeesCount || 1);
    setAdminEditNotes(b.notes || '');
    setAdminEditStatus(b.status || 'CONFIRMED');
    setAdminEditReason(b.cancellationReason || '');
    setAdminEditNote('');
    setAdminEditError('');
  };

  const handleAdminEditSubmit = async (e) => {
    e.preventDefault();
    if (!adminEditTarget) return;
    setAdminEditLoading(true);
    setAdminEditError('');

    try {
      await api.put(`/bookings/${adminEditTarget.id}/admin-edit`, {
        title: adminEditTitle,
        roomId: adminEditRoomId,
        startTime: new Date(adminEditStartTime).toISOString(),
        endTime: new Date(adminEditEndTime).toISOString(),
        meetingType: adminEditMeetingType,
        attendeesCount: parseInt(adminEditAttendeesCount, 10),
        notes: adminEditNotes,
        status: adminEditStatus,
        cancellationReason: adminEditReason,
        adminNote: adminEditNote || 'Pembaruan data booking oleh Administrator',
      });

      setAdminEditTarget(null);
      fetchMyBookings();
    } catch (err) {
      setAdminEditError(err.response?.data?.message || 'Gagal menyimpan perubahan booking.');
    } finally {
      setAdminEditLoading(false);
    }
  };

  // Handlers for Admin Direct Delete
  const openAdminDelete = (b) => {
    setAdminDeleteTarget(b);
    setAdminDeleteReason('');
    setAdminDeleteError('');
  };

  const handleAdminDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!adminDeleteTarget) return;
    setAdminDeleteLoading(true);
    setAdminDeleteError('');

    try {
      await api.delete(`/bookings/${adminDeleteTarget.id}`, {
        data: { reason: adminDeleteReason || 'Dihapus oleh Administrator' },
      });

      setAdminDeleteTarget(null);
      fetchMyBookings();
    } catch (err) {
      setAdminDeleteError(err.response?.data?.message || 'Gagal menghapus booking dari sistem.');
    } finally {
      setAdminDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {t('Reservasi Ruangan Saya')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Kelola jadwal rapat, perpanjangan waktu, Check-in/out ruangan, dan administrasi.')}
          </p>
        </div>
        <Link to="/bookings/new" className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto font-bold shadow-xs">
          <PlusCircle size={16} />
          <span>{t('Booking Baru')}</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'ALL', label: t('Semua Booking') },
            { key: 'UPCOMING', label: t('Mendatang') },
            { key: 'ACTIVE', label: t('Sedang Berlangsung') },
            { key: 'COMPLETED', label: t('Selesai') },
            { key: 'CANCELLED', label: t('Dibatalkan') },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === tab.key
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari agenda, kode, ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-xs pl-8 py-1.5 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs sm:text-sm font-semibold">
          {t('Memuat riwayat booking...')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs sm:text-sm">
          {search ? 'Tidak ada booking yang cocok dengan pencarian Anda.' : t('Belum ada reservasi pada kategori ini.')}
        </div>
      ) : (
        <>
          {/* ========================================================== */}
          {/* MOBILE VIEW (< md): Ergonomic Native Industrial Card List   */}
          {/* ========================================================== */}
          <div className="md:hidden space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{b.bookingCode}</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-snug truncate">
                      {b.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{b.room.name} ({b.room.location})</span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Date & Time Box */}
                <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Calendar size={13} className="text-brand-500" />
                    <span>
                      {new Date(b.startTime).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Clock size={12} />
                    <span className="font-mono">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <Link to={`/bookings/${b.id}`} className="btn btn-ghost text-xs py-1.5 px-3 font-bold">
                    {t('Detail')}
                  </Link>

                  {/* Reschedule button for booker */}
                  {(b.status === 'CONFIRMED' || b.status === 'NO_SHOW_PENDING') && (
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleTarget(b);
                        setRescheduleStart(new Date(b.startTime).toISOString().slice(0, 16));
                        setRescheduleEnd(new Date(b.endTime).toISOString().slice(0, 16));
                        setRescheduleReason('');
                      }}
                      className="btn btn-ghost text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>{t('Reschedule')}</span>
                    </button>
                  )}

                  {/* Extension button if checked in */}
                  {b.status === 'CHECKED_IN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setExtendTarget(b);
                        setExtendMinutes(30);
                      }}
                      className="btn bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                    >
                      +{t('Perpanjang')}
                    </button>
                  )}

                  {/* Cancel button if not checked in */}
                  {(b.status === 'CONFIRMED' || b.status === 'NO_SHOW_PENDING') && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(b);
                        setCancelReason('');
                      }}
                      className="btn btn-ghost text-rose-500 hover:bg-rose-50 text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{t('Batal')}</span>
                    </button>
                  )}

                  {/* QR Scan Action */}
                  {b.status === 'CONFIRMED' && (
                    <Link to="/scan/checkin" className="btn btn-primary text-xs py-1.5 px-3 font-bold">
                      <QrCode size={13} />
                      <span>Check-In</span>
                    </Link>
                  )}
                  {b.status === 'CHECKED_IN' && (
                    <Link to="/scan/checkout" className="btn bg-rose-600 text-white text-xs py-1.5 px-3 font-bold">
                      <QrCode size={13} />
                      <span>Check-Out</span>
                    </Link>
                  )}

                  {/* Admin Direct Edit */}
                  {canAdminEdit && (
                    <button
                      type="button"
                      onClick={() => openAdminEdit(b)}
                      className="btn bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                      title="Edit Booking Lengkap (Admin Mode)"
                    >
                      <Sliders size={13} />
                      <span>Edit (Admin)</span>
                    </button>
                  )}

                  {/* Admin Direct Delete */}
                  {canAdminDelete && (
                    <button
                      type="button"
                      onClick={() => openAdminDelete(b)}
                      className="btn btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs py-1.5 px-2 font-bold cursor-pointer"
                      title="Hapus Booking Permanen (Admin Mode)"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ========================================================== */}
          {/* DESKTOP VIEW (≥ md): High-Density Table                    */}
          {/* ========================================================== */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th">{t('Kode / Agenda')}</th>
                  <th className="th">{t('Ruangan')}</th>
                  <th className="th">{t('Jadwal Rencana')}</th>
                  <th className="th">{t('Status')}</th>
                  <th className="th text-right">{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="td">
                      <div className="font-mono text-[10px] text-slate-400 font-bold">{b.bookingCode}</div>
                      <div className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{b.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {b.meetingType} &bull; {b.attendeesCount} {t('orang')}
                      </div>
                    </td>

                    <td className="td">
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">{b.room.name}</div>
                      <div className="text-xs text-slate-400">{b.room.location}</div>
                    </td>

                    <td className="td">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {new Date(b.startTime).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold font-mono">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </td>

                    <td className="td">
                      <StatusBadge status={b.status} />
                    </td>

                    <td className="td text-right">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        <Link to={`/bookings/${b.id}`} className="btn btn-ghost text-xs py-1 px-2.5 font-bold">
                          {t('Detail')}
                        </Link>

                        {(b.status === 'CONFIRMED' || b.status === 'NO_SHOW_PENDING') && (
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(b);
                              setRescheduleStart(new Date(b.startTime).toISOString().slice(0, 16));
                              setRescheduleEnd(new Date(b.endTime).toISOString().slice(0, 16));
                              setRescheduleReason('');
                            }}
                            className="btn btn-ghost text-xs py-1 px-2"
                            title={t('Reschedule')}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {b.status === 'CHECKED_IN' && (
                          <button
                            type="button"
                            onClick={() => {
                              setExtendTarget(b);
                              setExtendMinutes(30);
                            }}
                            className="btn bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 px-2 font-bold"
                          >
                            +{t('Perpanjang')}
                          </button>
                        )}

                        {(b.status === 'CONFIRMED' || b.status === 'NO_SHOW_PENDING') && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelTarget(b);
                              setCancelReason('');
                            }}
                            className="btn btn-ghost text-rose-500 hover:bg-rose-50 text-xs py-1 px-2"
                            title={t('Batalkan')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Admin Direct Edit */}
                        {canAdminEdit && (
                          <button
                            type="button"
                            onClick={() => openAdminEdit(b)}
                            className="btn bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 text-xs py-1 px-2.5 font-bold cursor-pointer"
                            title="Edit Booking Lengkap (Admin Mode)"
                          >
                            <Sliders size={12} />
                            <span>Edit (Admin)</span>
                          </button>
                        )}

                        {/* Admin Direct Delete */}
                        {canAdminDelete && (
                          <button
                            type="button"
                            onClick={() => openAdminDelete(b)}
                            className="btn btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs py-1 px-2 cursor-pointer"
                            title="Hapus Booking Permanen (Admin Mode)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* USER SELF-SERVICE MODALS: RESCHEDULE, EXTEND, CANCEL            */}
      {/* ============================================================== */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">{t('Reschedule Jadwal Rapat')}</h3>
              <button onClick={() => setRescheduleTarget(null)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="label">{t('Waktu Mulai Baru')}</label>
                <input
                  type="datetime-local"
                  required
                  className="input text-xs"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Waktu Selesai Baru')}</label>
                <input
                  type="datetime-local"
                  required
                  className="input text-xs"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Alasan Reschedule')}</label>
                <textarea
                  rows="2"
                  required
                  className="input text-xs resize-none py-2"
                  placeholder="Input alasan perubahan jadwal meeting"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setRescheduleTarget(null)} className="btn btn-ghost text-xs">
                  {t('Batal')}
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary text-xs font-bold">
                  {actionLoading ? t('Memproses...') : t('Simpan Jadwal Baru')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTENSION MODAL */}
      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">{t('Perpanjang Waktu (Extension)')}</h3>
              <button onClick={() => setExtendTarget(null)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                {t('Perpanjangan waktu hanya diperbolehkan jika tidak ada booking atau maintenance lain yang bentrok setelah jadwal ini.')}
              </p>

              <div>
                <label className="label">{t('Pilih Tambahan Waktu')}</label>
                <select
                  className="input text-xs font-bold"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(e.target.value)}
                >
                  <option value="15">+15 {t('menit')}</option>
                  <option value="30">+30 {t('menit')}</option>
                  <option value="45">+45 {t('menit')}</option>
                  <option value="60">+60 {t('menit')} (1 {t('jam')})</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setExtendTarget(null)} className="btn btn-ghost text-xs">
                  {t('Batal')}
                </button>
                <button type="submit" disabled={actionLoading} className="btn bg-purple-600 text-white text-xs font-bold">
                  {actionLoading ? t('Memproses...') : t('Perpanjang Sekarang')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">{t('Batalkan Reservasi')}</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <p className="text-xs text-slate-500">
                {t('Apakah Anda yakin ingin membatalkan booking')} <strong>{cancelTarget.title}</strong>?
              </p>

              <div>
                <label className="label">{t('Alasan Pembatalan')}</label>
                <textarea
                  rows="2"
                  required
                  className="input text-xs resize-none py-2"
                  placeholder="Input alasan pembatalan meeting"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setCancelTarget(null)} className="btn btn-ghost text-xs">
                  {t('Tutup')}
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-danger text-xs font-bold">
                  {actionLoading ? t('Memproses...') : t('Konfirmasi Batal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN FULL EDIT MODAL (booking:edit_any / ADMIN)              */}
      {/* ============================================================== */}
      {adminEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center">
                  <Sliders size={17} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                    Edit Booking Lengkap (Admin Mode)
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    {adminEditTarget.bookingCode} &bull; Pemesan: {adminEditTarget.user?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {adminEditError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 text-xs font-semibold">
                  {adminEditError}
                </div>
              )}

              <div>
                <label className="label">Agenda / Judul Rapat</label>
                <input
                  type="text"
                  required
                  value={adminEditTitle}
                  onChange={(e) => setAdminEditTitle(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Pilih Ruangan</label>
                  <select
                    value={adminEditRoomId}
                    onChange={(e) => setAdminEditRoomId(e.target.value)}
                    className="input text-xs"
                    required
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Kap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Tipe Rapat</label>
                  <select
                    value={adminEditMeetingType}
                    onChange={(e) => setAdminEditMeetingType(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="INTERNAL">Internal</option>
                    <option value="CLIENT">Client / Tamu</option>
                    <option value="EXECUTIVE">Direksi / Executive</option>
                    <option value="TOWN_HALL">Town Hall</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    required
                    value={adminEditStartTime}
                    onChange={(e) => setAdminEditStartTime(e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    required
                    value={adminEditEndTime}
                    onChange={(e) => setAdminEditEndTime(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Jumlah Peserta</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adminEditAttendeesCount}
                    onChange={(e) => setAdminEditAttendeesCount(e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Status Booking</label>
                  <select
                    value={adminEditStatus}
                    onChange={(e) => setAdminEditStatus(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="CONFIRMED">CONFIRMED (Terkonfirmasi)</option>
                    <option value="CHECKED_IN">CHECKED_IN (Sedang Berlangsung)</option>
                    <option value="COMPLETED">COMPLETED (Selesai)</option>
                    <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
                    <option value="NO_SHOW">NO_SHOW (Tidak Hadir)</option>
                  </select>
                </div>
              </div>

              {adminEditStatus === 'CANCELLED' && (
                <div>
                  <label className="label">Alasan Pembatalan</label>
                  <input
                    type="text"
                    value={adminEditReason}
                    onChange={(e) => setAdminEditReason(e.target.value)}
                    placeholder="Masukkan alasan pembatalan..."
                    className="input text-xs"
                  />
                </div>
              )}

              <div>
                <label className="label">Catatan / Kebutuhan Fasilitas</label>
                <textarea
                  rows="2"
                  value={adminEditNotes}
                  onChange={(e) => setAdminEditNotes(e.target.value)}
                  className="input text-xs"
                  placeholder="Kebutuhan mic, proyektor, catering, dsb."
                />
              </div>

              <div>
                <label className="label">Alasan Perubahan (Audit Administrator)</label>
                <input
                  type="text"
                  value={adminEditNote}
                  onChange={(e) => setAdminEditNote(e.target.value)}
                  placeholder="Contoh: Penyesuaian jam rapat direksi mendadak"
                  className="input text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdminEditTarget(null)}
                  className="btn btn-ghost text-xs py-2 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adminEditLoading}
                  className="btn btn-primary text-xs py-2 px-4 font-bold shadow-xs cursor-pointer"
                >
                  {adminEditLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN FULL DELETE MODAL (booking:delete_any / ADMIN)            */}
      {/* ============================================================== */}
      {adminDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center">
                  <Trash2 size={17} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-rose-900 dark:text-rose-100">
                    Hapus Booking Permanen (Admin)
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {adminDeleteTarget.bookingCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminDeleteTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminDeleteSubmit} className="p-5 space-y-4">
              {adminDeleteError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 text-xs font-semibold">
                  {adminDeleteError}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus data booking:
                <strong className="block text-slate-800 dark:text-white mt-1">
                  "{adminDeleteTarget.title}" ({adminDeleteTarget.room?.name})
                </strong>
                Booking ini akan dihapus permanen dari kalender dan database bersama seluruh riwayat terkait.
              </p>

              <div>
                <label className="label">Alasan Penghapusan (Audit Trail)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Booking keliru / dibatalkan atas permintaan pemesan"
                  value={adminDeleteReason}
                  onChange={(e) => setAdminDeleteReason(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminDeleteTarget(null)}
                  className="btn btn-ghost text-xs py-2 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adminDeleteLoading}
                  className="btn btn-danger text-xs py-2 px-4 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{adminDeleteLoading ? 'Menghapus...' : 'Ya, Hapus Permanen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
