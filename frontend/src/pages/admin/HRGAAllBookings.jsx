import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import StatusBadge from '../../components/StatusBadge';
import { Layers, ArrowRight, Edit3, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

// Convert ISO UTC date string to local YYYY-MM-DDTHH:mm for <input type="datetime-local">
const toLocalDatetimeInput = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function HRGAAllBookings() {
  const { isAdmin, hasPermission } = useAuth();
  const { showConfirm, showAlert } = useModal();

  const canEditAny = isAdmin || hasPermission('booking:edit_any');
  const canDeleteAny = isAdmin || hasPermission('booking:delete_any');

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

  // Edit Modal State
  const [editTarget, setEditTarget] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editMeetingType, setEditMeetingType] = useState('INTERNAL');
  const [editAttendeesCount, setEditAttendeesCount] = useState(1);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('CONFIRMED');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = '/bookings?myOnly=false&limit=100';
      if (roomId) url += `&roomId=${roomId}`;
      if (status) url += `&status=${status}`;
      if (date) url += `&startDate=${date}T00:00:00&endDate=${date}T23:59:59`;

      const [bRes, rRes] = await Promise.all([api.get(url), api.get('/rooms')]);
      setBookings(bRes.data.data || []);
      setRooms(rRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [roomId, status, date]);

  const openEditModal = (b) => {
    setEditTarget(b);
    setEditTitle(b.title || '');
    setEditRoomId(b.roomId || b.room?.id || '');
    setEditStartTime(toLocalDatetimeInput(b.startTime));
    setEditEndTime(toLocalDatetimeInput(b.endTime));
    setEditMeetingType(b.meetingType || 'INTERNAL');
    setEditAttendeesCount(b.attendeesCount || 1);
    setEditNotes(b.notes || '');
    setEditStatus(b.status || 'CONFIRMED');
    setEditReason('');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    const confirmed = await showConfirm({
      title: 'Konfirmasi Perubahan Jadwal Reservasi',
      message: `Simpan perubahan jadwal/data untuk reservasi "${editTarget.bookingCode}" (${editTitle})?`,
      type: 'warning',
      confirmText: 'Ya, Simpan Perubahan',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    setEditLoading(true);
    setEditError('');

    try {
      await api.put(`/bookings/${editTarget.id}/admin-edit`, {
        title: editTitle,
        roomId: editRoomId,
        startTime: new Date(editStartTime).toISOString(),
        endTime: new Date(editEndTime).toISOString(),
        meetingType: editMeetingType,
        attendeesCount: parseInt(editAttendeesCount, 10),
        notes: editNotes || null,
        status: editStatus,
        adminNote: editReason || 'Perubahan jadwal melalui menu Semua Reservasi',
      });

      setEditTarget(null);
      fetchBookings();
      showAlert({
        title: 'Berhasil Diperbarui',
        message: `Jadwal reservasi ${editTarget.bookingCode} berhasil diperbarui.`,
        type: 'success',
      });
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal menyimpan perubahan reservasi.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBooking = async (b) => {
    const confirmed = await showConfirm({
      title: 'Hapus Permanen Reservasi',
      message: `Apakah Anda yakin ingin menghapus permanen reservasi "${b.title}" (${b.bookingCode}) milik ${b.user?.name || 'karyawan'}?\n\nTindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/bookings/${b.id}`, {
        data: { reason: 'Dihapus melalui menu Semua Reservasi' },
      });
      fetchBookings();
      showAlert({
        title: 'Reservasi Dihapus',
        message: `Reservasi ${b.bookingCode} berhasil dihapus dari sistem.`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || 'Gagal menghapus reservasi.',
        type: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="text-brand-500" size={24} />
            <span>Seluruh Reservasi Ruang Meeting</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar lengkap seluruh booking karyawan dari semua departemen di Plant Batam.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Filter Ruangan</label>
          <select
            className="input text-xs"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <option value="">Semua Ruangan</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Filter Status</label>
          <select
            className="input text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="CONFIRMED">Terkonfirmasi (CONFIRMED)</option>
            <option value="CHECKED_IN">Aktif (CHECKED_IN)</option>
            <option value="NO_SHOW_PENDING">Terlambat (&gt;15m)</option>
            <option value="COMPLETED">Selesai (COMPLETED)</option>
            <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
          </select>
        </div>

        <div>
          <label className="label">Filter Tanggal Spesifik</label>
          <input
            type="date"
            className="input text-xs font-bold"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Content: High-Density Table on Desktop / Responsive Card List on Mobile */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat seluruh reservasi...</div>
      ) : bookings.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          Tidak ada booking yang cocok dengan filter pencarian.
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW (hidden md:block) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="th">Kode / Agenda</th>
                  <th className="th">Ruangan</th>
                  <th className="th">Pemesan & Departemen</th>
                  <th className="th">Jadwal Rencana</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td">
                      <span className="font-mono text-[10px] text-slate-400 font-bold block">{b.bookingCode}</span>
                      <strong className="text-slate-800 dark:text-white">{b.title}</strong>
                      <div className="text-[11px] text-slate-400">{b.attendeesCount} Peserta</div>
                    </td>
                    <td className="td font-semibold text-slate-700 dark:text-slate-300">
                      {b.room?.name}
                    </td>
                    <td className="td">
                      <div className="font-bold text-slate-800 dark:text-white">{b.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{b.user?.department?.name}</div>
                    </td>
                    <td className="td">
                      <div>{new Date(b.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                      <div className="text-slate-400">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </td>
                    <td className="td">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="td text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canEditAny && (
                          <button
                            type="button"
                            onClick={() => openEditModal(b)}
                            className="btn btn-ghost text-xs py-1 px-2 min-h-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="Edit Jadwal & Data Reservasi"
                          >
                            <Edit3 size={14} />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDeleteAny && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBooking(b)}
                            className="btn btn-ghost text-xs py-1 px-2 min-h-0 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Hapus Reservasi"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <Link to={`/bookings/${b.id}`} className="btn btn-ghost text-xs py-1 px-2.5 min-h-0">
                          <span>Detail</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 font-bold block">
                      {b.bookingCode}
                    </span>
                    <strong className="text-slate-900 dark:text-white text-sm font-bold block truncate mt-0.5">
                      {b.title}
                    </strong>
                    <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                      {b.room?.name}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={b.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Pemesan
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                      {b.user?.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {b.user?.department?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Jadwal
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block mt-0.5">
                      {new Date(b.startTime).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {new Date(b.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {b.attendeesCount} Peserta &bull; {b.meetingType}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {canEditAny && (
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="btn btn-ghost text-xs py-1.5 px-2.5 min-h-0 text-blue-600 dark:text-blue-400"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                    {canDeleteAny && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(b)}
                        className="btn btn-ghost text-xs py-1.5 px-2.5 min-h-0 text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <Link
                      to={`/bookings/${b.id}`}
                      className="btn btn-secondary text-xs py-1.5 px-3 min-h-0 flex items-center gap-1.5 font-bold cursor-pointer"
                    >
                      <span>Detail</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT JADWAL & DATA RESERVASI                             */}
      {/* ============================================================== */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  Edit Jadwal & Data Reservasi
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editTarget.bookingCode} &bull; {editTarget.user?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="label">Judul / Agenda Meeting</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Ruangan</label>
                  <select
                    className="input text-xs"
                    value={editRoomId}
                    onChange={(e) => setEditRoomId(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} org)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status Reservasi</label>
                  <select
                    className="input text-xs"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="CHECKED_IN">CHECKED_IN</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="NO_SHOW_PENDING">NO_SHOW_PENDING</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Waktu Mulai (WIB)</label>
                  <input
                    type="datetime-local"
                    required
                    className="input text-xs font-mono"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Waktu Selesai (WIB)</label>
                  <input
                    type="datetime-local"
                    required
                    className="input text-xs font-mono"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Kategori Meeting</label>
                  <select
                    className="input text-xs"
                    value={editMeetingType}
                    onChange={(e) => setEditMeetingType(e.target.value)}
                  >
                    <option value="INTERNAL">Meeting Internal</option>
                    <option value="EXTERNAL">Meeting Tamu / Vendor</option>
                    <option value="MANAGEMENT">Review Manajemen</option>
                    <option value="TRAINING">Pelatihan / Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="label">Jumlah Peserta</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-xs font-bold"
                    value={editAttendeesCount}
                    onChange={(e) => setEditAttendeesCount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Catatan / Kebutuhan</label>
                <input
                  type="text"
                  className="input text-xs"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Alasan Perubahan (Audit Log)</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="Contoh: Penyesuaian jadwal atas permintaan departemen"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="btn btn-ghost text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn btn-primary text-xs px-5"
                >
                  <CheckCircle2 size={15} />
                  <span>{editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
