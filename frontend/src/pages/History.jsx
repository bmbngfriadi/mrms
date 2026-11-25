import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useModal } from '../context/ModalContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  History as HistoryIcon,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  User,
  Building2,
  FileSpreadsheet,
  X,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export default function HistoryPage() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { t } = useI18n();
  const { showConfirm, showAlert } = useModal();

  const canEditHistory = isAdmin || hasPermission('history:edit');
  const canDeleteHistory = isAdmin || hasPermission('history:delete');

  const [history, setHistory] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [viewScope, setViewScope] = useState('my'); // 'my' or 'all'

  // Edit Riwayat Modal State
  const [editTarget, setEditTarget] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMeetingType, setEditMeetingType] = useState('INTERNAL');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('COMPLETED');
  const [editReason, setEditReason] = useState('');
  const [editActualCheckin, setEditActualCheckin] = useState('');
  const [editActualCheckout, setEditActualCheckout] = useState('');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Riwayat Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const isAllScope = (isAdmin || hasPermission('menu:all_bookings')) && viewScope === 'all';
      const myOnlyParam = isAllScope ? 'false' : 'true';
      const [hRes, rRes] = await Promise.all([
        api.get(`/bookings?myOnly=${myOnlyParam}&limit=200`),
        api.get('/rooms'),
      ]);

      const list = (hRes.data.data || []).filter(
        (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'NO_SHOW'
      );
      setHistory(list);
      setRooms(rRes.data.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [viewScope]);

  // Filtered List
  const filteredHistory = history.filter((b) => {
    // Status Filter
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

    // Room Filter
    if (roomFilter !== 'ALL' && b.roomId !== roomFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const codeMatch = b.bookingCode?.toLowerCase().includes(q);
      const titleMatch = b.title?.toLowerCase().includes(q);
      const roomMatch = b.room?.name?.toLowerCase().includes(q);
      const userMatch = b.user?.name?.toLowerCase().includes(q);
      const reasonMatch = b.cancellationReason?.toLowerCase().includes(q);
      if (!codeMatch && !titleMatch && !roomMatch && !userMatch && !reasonMatch) {
        return false;
      }
    }

    return true;
  });

  // Summary Metrics
  const totalCount = history.length;
  const completedCount = history.filter((b) => b.status === 'COMPLETED').length;
  const cancelledCount = history.filter((b) => b.status === 'CANCELLED').length;
  const noShowCount = history.filter((b) => b.status === 'NO_SHOW').length;

  // Handlers for Edit
  const openEditModal = (b) => {
    setEditTarget(b);
    setEditTitle(b.title || '');
    setEditMeetingType(b.meetingType || 'INTERNAL');
    setEditNotes(b.notes || '');
    setEditStatus(b.status || 'COMPLETED');
    setEditReason(b.cancellationReason || '');
    setEditActualCheckin(
      b.usageSession?.actualCheckin ? new Date(b.usageSession.actualCheckin).toISOString().slice(0, 16) : ''
    );
    setEditActualCheckout(
      b.usageSession?.actualCheckout ? new Date(b.usageSession.actualCheckout).toISOString().slice(0, 16) : ''
    );
    setEditAdminNote('');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError('');

    try {
      await api.put(`/bookings/${editTarget.id}/history-edit`, {
        title: editTitle,
        meetingType: editMeetingType,
        notes: editNotes,
        status: editStatus,
        cancellationReason: editReason,
        actualCheckin: editActualCheckin ? new Date(editActualCheckin).toISOString() : null,
        actualCheckout: editActualCheckout ? new Date(editActualCheckout).toISOString() : null,
        adminNote: editAdminNote || 'Koreksi arsip riwayat penggunaan oleh Administrator',
      });

      showAlert({
        title: 'Arsip Riwayat Diperbarui',
        message: `Data riwayat ${editTarget.bookingCode} berhasil diperbarui.`,
        type: 'success',
      });
      setEditTarget(null);
      fetchHistoryData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal memperbarui riwayat penggunaan.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handlers for Delete
  const openDeleteModal = (b) => {
    setDeleteTarget(b);
    setDeleteReason('');
    setDeleteError('');
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError('');

    try {
      await api.delete(`/bookings/${deleteTarget.id}/history`, {
        data: { reason: deleteReason || 'Dihapus oleh Administrator' },
      });

      showAlert({
        title: 'Arsip Riwayat Dihapus',
        message: `Riwayat booking ${deleteTarget.bookingCode} telah dihapus dari sistem.`,
        type: 'success',
      });
      setDeleteTarget(null);
      fetchHistoryData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus riwayat penggunaan.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center shrink-0">
              <HistoryIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Riwayat Penggunaan Ruangan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Arsip lengkap seluruh sesi rapat, checkout, pembatalan, dan no-show PT Cemindo Gemilang Tbk.
              </p>
            </div>
          </div>
        </div>

        {/* Scope Toggle for Admin / HRGA */}
        {(isAdmin || hasPermission('menu:all_bookings')) && (
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewScope('my')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewScope === 'my'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Riwayat Saya
            </button>
            <button
              type="button"
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewScope === 'all'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Semua Karyawan (Admin)</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 font-bold">
            <HistoryIcon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Riwayat</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{totalCount}</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selesai Normal</div>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 font-bold">
            <XCircle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dibatalkan</div>
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">{cancelledCount}</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 font-bold">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tidak Hadir (No-Show)</div>
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">{noShowCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'ALL', label: 'Semua Status' },
            { key: 'COMPLETED', label: 'Selesai' },
            { key: 'CANCELLED', label: 'Dibatalkan' },
            { key: 'NO_SHOW', label: 'No-Show' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Room Filter & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="input text-xs py-1.5 min-w-[160px]"
          >
            <option value="ALL">Semua Ruangan</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
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
      </div>

      {/* Main Content: High-Density Table on Desktop / Mobile Data Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs sm:text-sm font-semibold">
          Memuat arsip riwayat penggunaan...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs sm:text-sm">
          {search || statusFilter !== 'ALL' || roomFilter !== 'ALL'
            ? 'Tidak ada riwayat yang sesuai dengan kriteria filter Anda.'
            : 'Belum ada arsip riwayat penggunaan pada kategori ini.'}
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 1. DESKTOP VIEW (hidden md:block) - High-Density Table   */}
          {/* ======================================================== */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th">Kode / Agenda</th>
                  <th className="th">Ruangan</th>
                  <th className="th">Pemesan</th>
                  <th className="th">Waktu Rencana</th>
                  <th className="th">Durasi & Realisasi</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="td">
                      <div className="font-mono text-[10px] font-bold text-slate-400">{b.bookingCode}</div>
                      <div className="font-bold text-slate-800 dark:text-white text-xs leading-tight">
                        {b.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.meetingType} &bull; {b.attendeesCount} orang
                      </div>
                    </td>

                    <td className="td">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                        {b.room?.name || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400">{b.room?.location || '-'}</div>
                    </td>

                    <td className="td">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                        {b.user?.name || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {b.user?.department?.code || b.user?.department?.name || '-'}
                      </div>
                    </td>

                    <td className="td">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {new Date(b.startTime).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold font-mono">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </td>

                    <td className="td">
                      {b.status === 'COMPLETED' ? (
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          {b.usageSession?.actualCheckout ? (
                            <div>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Checkout Selesai:</span>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {new Date(b.usageSession.actualCheckout).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} WIB
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Selesai Jadwal</span>
                          )}
                        </div>
                      ) : b.status === 'CANCELLED' ? (
                        <div className="text-xs text-rose-600 dark:text-rose-400 max-w-xs truncate" title={b.cancellationReason || 'Dibatalkan'}>
                          {b.cancellationReason || 'Dibatalkan'}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          No-Show (Tidak Check-in)
                        </div>
                      )}
                    </td>

                    <td className="td">
                      <StatusBadge status={b.status} />
                    </td>

                    <td className="td text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/bookings/${b.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Lihat Detail Lengkap"
                        >
                          <ArrowRight size={15} />
                        </Link>

                        {/* Admin Action: Edit Riwayat */}
                        {canEditHistory && (
                          <button
                            type="button"
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/50 text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition cursor-pointer"
                            title="Edit Riwayat (Admin Mode)"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {/* Admin Action: Delete Riwayat */}
                        {canDeleteHistory && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(b)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Hapus Riwayat (Admin Mode)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* 2. MOBILE VIEW (md:hidden) - Ergonomic Industrial Cards  */}
          {/* ======================================================== */}
          <div className="md:hidden space-y-3">
            {filteredHistory.map((b) => (
              <div key={b.id} className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{b.bookingCode}</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-snug truncate">
                      {b.title}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <DoorOpen size={12} className="text-slate-400" />
                      <span>{b.room?.name}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400 font-medium">{b.user?.name}</span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Timing Info Box */}
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
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span className="font-mono">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                    {b.cancellationReason && (
                      <span className="text-rose-500 truncate max-w-[140px]" title={b.cancellationReason}>
                        {b.cancellationReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Toolbar */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    to={`/bookings/${b.id}`}
                    className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                  >
                    <span>Detail</span>
                    <ArrowRight size={13} />
                  </Link>

                  {canEditHistory && (
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="btn bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Edit Riwayat</span>
                    </button>
                  )}

                  {canDeleteHistory && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal(b)}
                      className="btn btn-ghost text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs py-1.5 px-2.5 font-bold cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* EDIT RIWAYAT MODAL (Khusus Administrator / Permitted)     */}
      {/* ======================================================== */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center">
                  <Edit2 size={17} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                    Koreksi Arsip Riwayat (Admin)
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    {editTarget.bookingCode} &bull; {editTarget.room?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div>
                <label className="label">Agenda / Judul Rapat</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipe Meeting</label>
                  <select
                    value={editMeetingType}
                    onChange={(e) => setEditMeetingType(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="INTERNAL">Internal</option>
                    <option value="CLIENT">Client / Tamu</option>
                    <option value="EXECUTIVE">Direksi / Executive</option>
                    <option value="TOWN_HALL">Town Hall</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status Rapat</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="COMPLETED">COMPLETED (Selesai)</option>
                    <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
                    <option value="NO_SHOW">NO_SHOW (Tidak Hadir)</option>
                  </select>
                </div>
              </div>

              {editStatus === 'CANCELLED' && (
                <div>
                  <label className="label">Alasan Pembatalan</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Masukkan alasan pembatalan..."
                    className="input text-xs"
                  />
                </div>
              )}

              {/* Realization Times */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Realisasi Sesi (Optional)
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Check-in Aktual</label>
                    <input
                      type="datetime-local"
                      value={editActualCheckin}
                      onChange={(e) => setEditActualCheckin(e.target.value)}
                      className="input text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Check-out Aktual</label>
                    <input
                      type="datetime-local"
                      value={editActualCheckout}
                      onChange={(e) => setEditActualCheckout(e.target.value)}
                      className="input text-xs py-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Catatan Agenda / Notulen</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan hasil rapat..."
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Alasan Koreksi Administrator</label>
                <input
                  type="text"
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  placeholder="Contoh: Koreksi status no-show menjadi selesai sesuai laporan security"
                  className="input text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="btn btn-ghost text-xs py-2 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn btn-primary text-xs py-2 px-4 font-bold shadow-xs cursor-pointer"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Koreksi Riwayat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE RIWAYAT CONFIRMATION MODAL                        */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center">
                  <Trash2 size={17} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-rose-900 dark:text-rose-100">
                    Hapus Arsip Riwayat
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {deleteTarget.bookingCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 text-xs font-semibold">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus data riwayat penggunaan untuk rapat:
                <strong className="block text-slate-800 dark:text-white mt-1">
                  "{deleteTarget.title}" ({deleteTarget.room?.name})
                </strong>
                Tindakan ini akan menghapus data sesi dan riwayat permanen dari database.
              </p>

              <div>
                <label className="label">Alasan Penghapusan (Audit Trail)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Duplikasi data arsip rapat testing"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="btn btn-ghost text-xs py-2 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting}
                  className="btn btn-danger text-xs py-2 px-4 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{deleteSubmitting ? 'Menghapus...' : 'Ya, Hapus Permanen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
