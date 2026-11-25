import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  DoorOpen,
  Calendar,
  Clock,
  PlusCircle,
  QrCode,
  Users,
  CheckCircle2,
  MapPin,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rooms, setRooms] = useState([]);
  const [myTodayBookings, setMyTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [roomsRes, bookingsRes] = await Promise.all([
        api.get('/rooms'),
        api.get(`/bookings?startDate=${todayStr}T00:00:00&myOnly=true`),
      ]);

      setRooms(roomsRes.data.data || []);
      setMyTodayBookings(bookingsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(), 20000);
    return () => clearInterval(interval);
  }, []);

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.currentStatus === 'AVAILABLE').length;
  const occupiedRooms = rooms.filter((r) => r.currentStatus === 'OCCUPIED').length;
  const overdueRooms = rooms.filter((r) => r.currentStatus === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="card p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider mb-2">
              <span>Plant Batam &bull; Meeting Room System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {t('Halo')}, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {t('Reservasi ruang meeting mandiri tanpa approval. Pastikan scan QR Check-in di pintu ruangan saat memulai meeting.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/bookings/new" className="btn btn-primary text-xs sm:text-sm">
              <PlusCircle size={16} />
              <span>{t('Reservasi Baru')}</span>
            </Link>
            <button
              onClick={() => fetchDashboardData(true)}
              className="btn btn-ghost text-white border-slate-700 hover:bg-slate-800 text-xs sm:text-sm"
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('Segarkan')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('Total Ruangan')}</span>
            <DoorOpen size={18} className="text-brand-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white">{totalRooms}</div>
          <div className="text-[11px] text-slate-500 mt-1">Plant Batam</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('Tersedia')}</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{availableRooms}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('Siap digunakan')}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('Digunakan')}</span>
            <Users size={18} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{occupiedRooms}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('Sedang aktif')}</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('Overdue')}</span>
            <Clock size={18} />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{overdueRooms}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('Melebihi jadwal')}</div>
        </div>
      </div>

      {/* Quick QR Scan Strip */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <QrCode size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {t('Scan QR Pintu Ruangan')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('Check-in saat mulai meeting dan check-out saat selesai.')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/scan/checkin"
            className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <QrCode size={16} />
            <span>{t('Scan Check-In')}</span>
          </Link>
          <Link
            to="/scan/checkout"
            className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm flex-1 sm:flex-none"
          >
            <QrCode size={16} />
            <span>{t('Scan Check-Out')}</span>
          </Link>
        </div>
      </div>

      {/* Today's Bookings by Current User */}
      {myTodayBookings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-brand-500" />
              <span>{t('Agenda Booking Saya Hari Ini')}</span>
            </h2>
            <Link to="/my-bookings" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
              <span>{t('Lihat Semua')}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myTodayBookings.map((b) => (
              <div key={b.id} className="card p-4 space-y-3 border-l-4 border-l-brand-500">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{b.bookingCode}</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">{b.title}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} />
                      <span>{b.room.name} ({b.room.location})</span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  <Clock size={14} className="text-brand-500 shrink-0" />
                  <span className="font-bold">
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <Link to={`/bookings/${b.id}`} className="text-brand-600 font-bold hover:underline">
                    {t('Detail Reservasi')} &rarr;
                  </Link>
                  {b.status === 'CONFIRMED' && (
                    <Link to="/scan/checkin" className="btn btn-primary text-xs py-1 px-3 min-h-0">
                      {t('Check-In Sekarang')}
                    </Link>
                  )}
                  {b.status === 'CHECKED_IN' && (
                    <Link to="/scan/checkout" className="btn bg-rose-600 text-white text-xs py-1 px-3 min-h-0">
                      {t('Check-Out')}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Room Status Grid (All Rooms) with Photos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <DoorOpen size={18} className="text-brand-500" />
              <span>{t('Status Ketersediaan Ruangan')}</span>
            </h2>
          </div>
          <Link to="/rooms" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
            <span>{t('Daftar Lengkap')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isOccupied = room.currentStatus === 'OCCUPIED';
            const isOverdue = room.currentStatus === 'OVERDUE';

            return (
              <div
                key={room.id}
                className={`card overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md ${
                  isOverdue ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/10' : ''
                }`}
              >
                <div>
                  {/* Room Photo */}
                  <div className="relative h-28 w-full bg-slate-800 overflow-hidden">
                    <img
                      src={room.imageUrl || 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80'}
                      alt={room.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono font-bold text-white">
                        {room.code}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={room.currentStatus} type="room" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                      <span className="text-[11px] font-bold truncate">{room.location}</span>
                      <span className="text-[10px] font-semibold opacity-90">{room.capacity} org</span>
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">{room.name}</h3>

                    {/* Active session info if occupied / overdue */}
                    {(isOccupied || isOverdue) && room.activeSession && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs">
                        <div className="font-bold text-rose-900 dark:text-rose-200 truncate">
                          {room.activeSession.booking?.title}
                        </div>
                        <div className="text-[11px] text-rose-700 dark:text-rose-400">
                          {room.activeSession.booking?.user?.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 pt-0">
                  <Link
                    to={`/bookings/new?roomId=${room.id}`}
                    className="w-full btn btn-ghost text-xs py-1.5 flex items-center justify-center gap-1"
                  >
                    <span>{t('Pesan Ruangan')}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
