import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import RoomPhotoCarousel from '../components/RoomPhotoCarousel';
import { Users, MapPin, Calendar, Clock, PlusCircle, ArrowLeft, Check } from 'lucide-react';

export default function RoomDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms/${id}/availability?date=${date}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load room details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [id, date]);

  if (loading && !data) {
    return <div className="text-center py-12 text-slate-400">{t('Memuat detail ruangan...')}</div>;
  }

  if (!data?.room) {
    return <div className="card p-12 text-center text-slate-400">{t('Ruangan tidak ditemukan.')}</div>;
  }

  const { room, bookings = [], blocks = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/rooms" className="btn btn-ghost py-1.5 px-3 text-xs">
          <ArrowLeft size={16} />
          <span>{t('Kembali ke Daftar Ruangan')}</span>
        </Link>
        <Link
          to={`/bookings/new?roomId=${room.id}`}
          className="btn btn-primary text-xs sm:text-sm"
        >
          <PlusCircle size={16} />
          <span>{t('Pesan Ruangan Ini')}</span>
        </Link>
      </div>

      {/* Room Photo Hero Banner with Auto-Sliding Carousel */}
      <div className="relative rounded-2xl w-full bg-slate-900 overflow-hidden shadow-md">
        <RoomPhotoCarousel
          photos={room.photos}
          imageUrl={room.imageUrl}
          alt={room.name}
          aspectRatio="aspect-[21/9]"
          className="max-h-[340px]"
        />

        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-xs font-mono font-bold text-white border border-white/20 pointer-events-auto">
            {room.code}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-none">
          <div className="drop-shadow-md">
            <h1 className="text-xl sm:text-3xl font-black text-white drop-shadow-sm">{room.name}</h1>
            <div className="text-xs sm:text-sm text-slate-200 flex items-center gap-1.5 mt-1">
              <MapPin size={14} />
              <span>{room.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xs text-white font-bold text-xs flex items-center gap-1.5 border border-white/20">
              <Users size={14} />
              <span>{t('Kapasitas')} {room.capacity} {t('Orang')}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Specs & Facilities */}
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-5 space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {room.description || t('Ruangan meeting operasional PT Cemindo Gemilang Tbk – Plant Batam.')}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {t('Daftar Fasilitas')}
              </h3>
              <ul className="space-y-2">
                {room.facilities?.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                  >
                    <span className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>{t(f.name)}</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {f.quantity} {t('unit')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Col: Timeline & Daily Schedule */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar size={18} className="text-brand-500" />
                  <span>{t('Jadwal Ruangan')}</span>
                </h3>
              </div>
              <input
                type="date"
                className="input sm:w-44 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Scheduled Blocks */}
            {blocks.length > 0 && (
              <div className="space-y-2">
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{b.title} ({b.blockType})</div>
                      <div className="text-[11px] opacity-80">{b.reason}</div>
                    </div>
                    <span className="font-mono font-bold text-[11px]">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bookings List */}
            {bookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('Tidak ada agenda meeting pada tanggal ini. Ruangan tersedia penuh.')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{b.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {t('Pemesan')}: <strong>{b.user.name}</strong> ({b.user.department?.name}) &bull; {b.attendeesCount} {t('peserta')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
