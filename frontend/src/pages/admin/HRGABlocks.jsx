import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useModal } from '../../context/ModalContext';
import { ShieldCheck, Plus, X, Trash2, AlertCircle } from 'lucide-react';

export default function HRGABlocks() {
  const { showConfirm, showAlert } = useModal();
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [blockType, setBlockType] = useState('MAINTENANCE');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/rooms/blocks/all'),
        api.get('/rooms'),
      ]);
      setBlocks(bRes.data.data || []);
      const roomList = rRes.data.data || [];
      setRooms(roomList);
      if (!roomId && roomList.length > 0) {
        setRoomId(roomList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const openCreate = () => {
    setTitle('Maintenance AC & Proyektor');
    setReason('Pembersihan filter AC dan penggantian bohlam proyektor');
    setBlockType('MAINTENANCE');
    const now = new Date();
    setStartTime(now.toISOString().slice(0, 16));
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setEndTime(later.toISOString().slice(0, 16));
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/rooms/blocks', {
        roomId,
        title,
        reason,
        blockType,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setModalOpen(false);
      fetchBlocks();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat blokir ruangan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBlock = async (id, title) => {
    const confirmed = await showConfirm({
      title: 'Batalkan Pemblokiran Ruangan',
      message: `Apakah Anda yakin ingin membatalkan pemblokiran '${title}'? Ruangan ini akan segera kembali berstatus Tersedia dan dapat dipesan oleh karyawan.`,
      type: 'warning',
      confirmText: 'Batalkan Pemblokiran',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/rooms/blocks/${id}`);
      fetchBlocks();
      showAlert({
        title: 'Pemblokiran Dibatalkan',
        message: `Pemblokiran '${title}' berhasil dibatalkan.`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Membatalkan',
        message: err.response?.data?.message || 'Gagal membatalkan blokir.',
        type: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-500" size={24} />
            <span>Pemblokiran Ruangan & Maintenance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Jadwalkan pemeliharaan teknis, renovasi, atau penutupan manajemen agar tidak dapat dipesan karyawan.
          </p>
        </div>

        <button onClick={openCreate} className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1.5">
          <Plus size={16} />
          <span>Tambah Jadwal Maintenance</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat data pemblokiran...</div>
      ) : blocks.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          Tidak ada pemblokiran ruangan atau jadwal maintenance aktif.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blocks.map((b) => (
            <div key={b.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {b.blockType}
                  </span>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white mt-1">{b.title}</h3>
                  <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{b.room?.name}</div>
                </div>
                {b.isActive ? (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    AKTIF DIBLOKIR
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                    DIBATALKAN / SELESAI
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">{b.reason}</p>

              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                <div>
                  Mulai: <strong>{new Date(b.startTime).toLocaleString('id-ID')}</strong>
                </div>
                <div>
                  Selesai: <strong>{new Date(b.endTime).toLocaleString('id-ID')}</strong>
                </div>
              </div>

              {b.isActive && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleCancelBlock(b.id, b.title)}
                    className="btn btn-ghost text-xs text-rose-500 hover:bg-rose-50 py-1 px-3 min-h-0"
                  >
                    <Trash2 size={13} />
                    <span>Buka Blokir Ruangan</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Jadwal Pemblokiran Ruangan</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <select className="input text-xs font-bold" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Ruangan: {r.name} ({r.code})
                  </option>
                ))}
              </select>

              <select className="input text-xs" value={blockType} onChange={(e) => setBlockType(e.target.value)}>
                <option value="MAINTENANCE">MAINTENANCE (Pemeliharaan Fasilitas)</option>
                <option value="MANAGEMENT_HOLD">MANAGEMENT HOLD (Pemesanan Khusus)</option>
                <option value="CLEANING">CLEANING (Pembersihan)</option>
                <option value="SPECIAL_EVENT">SPECIAL EVENT (Acara Internal)</option>
              </select>

              <div>
                <label className="label">Agenda Pemblokiran</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  placeholder="Input agenda pemblokiran ruangan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Alasan & Rincian Kebutuhan</label>
                <textarea
                  rows="2"
                  required
                  className="input text-xs resize-none py-2"
                  placeholder="Input alasan pemblokiran ruangan"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="datetime-local"
                  required
                  className="input text-xs font-bold"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <input
                  type="datetime-local"
                  required
                  className="input text-xs font-bold"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary text-xs">
                  {submitting ? 'Memeriksa Bentrok...' : 'Simpan Blokir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
