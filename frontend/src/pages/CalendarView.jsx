import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Calendar as CalendarIcon, Clock, DoorOpen, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';

export default function CalendarView() {
  const { t, lang } = useI18n();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('ALL');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms');
        setRooms(res.data.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRooms();
  }, []);

  // Fetch bookings for the active month
  const fetchMonthBookings = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Start of month to end of month
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      let url = `/bookings?startDate=${start.toISOString()}&endDate=${end.toISOString()}&limit=200`;
      if (selectedRoomId !== 'ALL') {
        url += `&roomId=${selectedRoomId}`;
      }

      const res = await api.get(url);
      setBookings(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthBookings();
  }, [currentDate, selectedRoomId]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar grid days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const monthName = currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('Kalender Jadwal')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Visualisasi seluruh jadwal meeting dan ketersediaan ruangan Plant Batam.')}
          </p>
        </div>
        <Link to="/bookings/new" className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto">
          <PlusCircle size={16} />
          <span>{t('Booking Baru')}</span>
        </Link>
      </div>

      {/* Room Filters & Month Controls */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Room Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedRoomId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${selectedRoomId === 'ALL'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {t('Semua Ruangan')}
            </button>
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${selectedRoomId === r.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white min-w-36 text-center capitalize">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days Grid Header */}
        <div className="grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
          <span className="text-rose-500">{lang === 'en' ? 'Sun' : 'Min'}</span>
          <span>{lang === 'en' ? 'Mon' : 'Sen'}</span>
          <span>{lang === 'en' ? 'Tue' : 'Sel'}</span>
          <span>{lang === 'en' ? 'Wed' : 'Rab'}</span>
          <span>{lang === 'en' ? 'Thu' : 'Kam'}</span>
          <span>{lang === 'en' ? 'Fri' : 'Jum'}</span>
          <span className="text-amber-500">{lang === 'en' ? 'Sat' : 'Sab'}</span>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-20 sm:min-h-24 p-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 opacity-40" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayBookings = bookings.filter((b) => b.startTime.startsWith(dateStr));
            const isToday =
              new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={dayNum}
                className={`min-h-20 sm:min-h-24 p-1.5 rounded-xl border flex flex-col justify-between transition-colors ${isToday
                    ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-500 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    {dayNum}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-16">
                  {dayBookings.slice(0, 3).map((b) => (
                    <Link
                      key={b.id}
                      to={`/bookings/${b.id}`}
                      className="block p-1 rounded text-[10px] font-semibold truncate bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-brand-900/40"
                      title={`${b.title} (${b.room?.name})`}
                    >
                      <span className="font-bold text-brand-600 dark:text-brand-400 mr-1">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {b.title}
                    </Link>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[9px] font-bold text-slate-400 text-center">
                      +{dayBookings.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
