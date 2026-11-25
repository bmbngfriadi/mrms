import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Layers, Search, Calendar, DoorOpen, ArrowRight } from 'lucide-react';

export default function HRGAAllBookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

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
                      {b.room.name}
                    </td>
                    <td className="td">
                      <div className="font-bold text-slate-800 dark:text-white">{b.user.name}</div>
                      <div className="text-[11px] text-slate-400">{b.user.department?.name}</div>
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
                      <Link to={`/bookings/${b.id}`} className="btn btn-ghost text-xs py-1 px-2.5 min-h-0">
                        <span>Detail</span>
                        <ArrowRight size={13} />
                      </Link>
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

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {b.attendeesCount} Peserta &bull; {b.meetingType}
                  </span>
                  <Link
                    to={`/bookings/${b.id}`}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <span>Detail</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
