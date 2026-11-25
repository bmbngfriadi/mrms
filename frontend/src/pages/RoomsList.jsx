import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import RoomPhotoCarousel from '../components/RoomPhotoCarousel';
import { Users, MapPin, Search, ArrowRight, Check } from 'lucide-react';

export default function RoomsList() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms');
        setRooms(res.data.data || []);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const filtered = rooms.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const matchCap = minCapacity ? r.capacity >= parseInt(minCapacity, 10) : true;
    return matchSearch && matchCap;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('Ruang Meeting')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Daftar ruangan rapat PT Cemindo Gemilang Tbk – Plant Batam.')}
          </p>
        </div>
        <Link to="/bookings/new" className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto">
          {t('Reservasi Ruangan')}
        </Link>
      </div>

      {/* Filter and Search Bar - Clean & Compact */}
      <div className="card p-3 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 flex items-center">
          <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="input text-xs"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Input pencarian ruangan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <select
            className="input text-xs"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
          >
            <option value="">{t('Semua Kapasitas')}</option>
            <option value="6">&ge; 6 {t('Orang')}</option>
            <option value="8">&ge; 8 {t('Orang')}</option>
            <option value="12">&ge; 12 {t('Orang')}</option>
            <option value="20">&ge; 20 {t('Orang')}</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid with Auto-Slide Photos */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat data ruangan...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          Tidak ada ruangan yang cocok dengan kriteria pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((room) => (
            <div key={room.id} className="card overflow-hidden flex flex-col justify-between">
              <div>
                {/* Room Photo Carousel Header with Auto-Slide */}
                <div className="relative w-full overflow-hidden">
                  <RoomPhotoCarousel
                    photos={room.photos}
                    imageUrl={room.imageUrl}
                    alt={room.name}
                    aspectRatio="aspect-[16/10]"
                  />
                  
                  {/* Top Bar on Photo */}
                  <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[11px] font-mono font-bold text-white border border-white/20 shadow-sm">
                      {room.code}
                    </span>
                    <div className="pointer-events-auto">
                      <StatusBadge status={room.currentStatus} type="room" />
                    </div>
                  </div>

                  {/* Bottom Title on Photo */}
                  <div className="absolute bottom-3 inset-x-3 z-20 flex items-end justify-between pointer-events-none">
                    <div className="drop-shadow-md">
                      <h3 className="font-bold text-base text-white drop-shadow-sm">{room.name}</h3>
                      <div className="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} />
                        <span>{room.location}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white font-bold text-xs flex items-center gap-1 shrink-0 border border-white/10 shadow-sm pointer-events-auto">
                      <Users size={12} />
                      {room.capacity} org
                    </span>
                  </div>
                </div>

                {/* Facilities & Description */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {room.description || 'Ruangan meeting operasional terintegrasi.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {room.facilities?.map((f) => (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        <Check size={11} className="text-emerald-500" />
                        {f.name} {f.quantity > 1 ? `(${f.quantity}x)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <Link
                  to={`/rooms/${room.id}`}
                  className="btn btn-ghost text-xs py-2 flex-1"
                >
                  {t('Jadwal & Detail')}
                </Link>
                <Link
                  to={`/bookings/new?roomId=${room.id}`}
                  className="btn btn-primary text-xs py-2 flex-1"
                >
                  <span>{t('Pesan Ruangan')}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
