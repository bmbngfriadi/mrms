import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useModal } from '../context/ModalContext';
import api from '../services/api';
import { PlusCircle, Calendar, Clock, Users, AlertCircle, CheckCircle2, ArrowLeft, Coffee, CupSoda, Droplets, ListPlus } from 'lucide-react';

export default function CreateBooking() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { showConfirm } = useModal();
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || '';

  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('INTERNAL');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendeesCount, setAttendeesCount] = useState(4);
  const [notes, setNotes] = useState('');
  const [needCoffee, setNeedCoffee] = useState(false);
  const [needTea, setNeedTea] = useState(false);
  const [needWater, setNeedWater] = useState(false);
  const [needOthers, setNeedOthers] = useState(false);
  const [othersText, setOthersText] = useState('');

  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/rooms?activeOnly=true');
        const list = res.data.data || [];
        setRooms(list);
        if (!roomId && list.length > 0) {
          setRoomId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [roomId]);

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!roomId) {
      setError(t('Silakan pilih ruangan meeting.'));
      return;
    }

    if (selectedRoom && attendeesCount > selectedRoom.capacity) {
      setError(`${t('Jumlah peserta')} (${attendeesCount}) ${t('melebihi kapasitas ruangan')} (${selectedRoom.capacity} ${t('orang')}).`);
      return;
    }

    // Construct ISO datetime string for Asia/Jakarta (UTC+7)
    const startIso = `${date}T${startTime}:00+07:00`;
    const endIso = `${date}T${endTime}:00+07:00`;

    if (new Date(startIso) >= new Date(endIso)) {
      setError(t('Jam selesai harus lebih lambat dari jam mulai.'));
      return;
    }

    const durationMin = (new Date(endIso) - new Date(startIso)) / 60000;
    if (durationMin < 30) {
      setError(t('Durasi meeting minimal adalah 30 menit.'));
      return;
    }
    if (durationMin > 240) {
      setError(t('Durasi meeting maksimal adalah 4 jam.'));
      return;
    }

    const requirements = [];
    if (needCoffee) requirements.push('Kopi');
    if (needTea) requirements.push('Teh');
    if (needWater) requirements.push('Air Putih');
    if (needOthers && othersText.trim()) {
      requirements.push(othersText.trim());
    } else if (needOthers) {
      requirements.push('Lainnya');
    }

    const reqSummary = requirements.length > 0 ? `\n• Kebutuhan: ${requirements.join(', ')}` : '';
    const confirmed = await showConfirm({
      title: t('Konfirmasi Reservasi Ruangan'),
      message: `${t('Apakah data reservasi berikut sudah benar?')}\n\n• Ruangan: ${selectedRoom?.name || '-'}\n• Agenda: ${title}\n• Jadwal: ${date} (${startTime} – ${endTime} WIB)\n• Peserta: ${attendeesCount} orang${reqSummary}`,
      type: 'info',
      confirmText: t('Ya, Konfirmasi Reservasi'),
      cancelText: t('Periksa Kembali'),
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        roomId,
        title,
        meetingType,
        attendeesCount: parseInt(attendeesCount, 10),
        requirements,
        notes: notes.trim() || null,
        startTime: new Date(startIso).toISOString(),
        endTime: new Date(endIso).toISOString(),
      });

      const newBooking = res.data.data;
      setSuccess(newBooking);
      setTimeout(() => {
        navigate(`/bookings/${newBooking.id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || t('Gagal membuat reservasi.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-ghost py-1.5 px-3 text-xs">
            <ArrowLeft size={16} />
            <span>{t('Kembali')}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('Reservasi Ruangan')}
          </h1>
        </div>
        <div className="text-xs text-slate-500 font-bold hidden sm:block">
          {user?.name} &bull; {user?.department?.name}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Booking <strong>{success.bookingCode}</strong> {t('berhasil dikonfirmasi!')}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {/* Room Selection with Photos */}
        <div>
          {loadingRooms ? (
            <div className="text-xs text-slate-400 py-4 text-center">{t('Memuat ruangan...')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {rooms.map((r) => {
                const isSelected = r.id === roomId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoomId(r.id)}
                    className={`rounded-xl border overflow-hidden text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="relative h-20 w-full bg-slate-800 overflow-hidden">
                      <img
                        src={r.imageUrl || 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80'}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold">
                        <span>{r.code}</span>
                        <span>{r.capacity} {t('orang')}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900">
                      <div className="font-bold text-xs text-slate-800 dark:text-white truncate">{r.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{r.location}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Meeting Agenda & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="label">{t('Judul / Agenda Meeting')}</label>
            <input
              type="text"
              required
              className="input text-xs"
              placeholder="Input judul meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('Kategori Meeting')}</label>
            <select
              className="input text-xs"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
            >
              <option value="INTERNAL">{t('Meeting Internal')}</option>
              <option value="EXTERNAL">{t('Meeting Tamu / Vendor')}</option>
              <option value="MANAGEMENT">{t('Review Manajemen')}</option>
              <option value="TRAINING">{t('Pelatihan / Workshop')}</option>
            </select>
          </div>
        </div>

        {/* Date, Times & Attendees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">{t('Tanggal')}</label>
            <input
              type="date"
              required
              className="input text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('Jam Mulai')}</label>
            <input
              type="time"
              required
              className="input text-xs font-mono"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('Jam Selesai')}</label>
            <input
              type="time"
              required
              className="input text-xs font-mono"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('Peserta')}</label>
            <input
              type="number"
              min="1"
              max={selectedRoom?.capacity || 50}
              required
              className="input text-xs font-bold"
              placeholder="Input jumlah peserta"
              value={attendeesCount}
              onChange={(e) => setAttendeesCount(e.target.value)}
            />
          </div>
        </div>

        {/* Kebutuhan / Konsumsi Checklist */}
        <div className="space-y-2.5 pt-1">
          <label className="label">{t('Kebutuhan Konsumsi & Tambahan (Opsional)')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Kopi */}
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all min-h-[44px] select-none ${
                needCoffee
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={needCoffee}
                onChange={(e) => setNeedCoffee(e.target.checked)}
                className="w-4 h-4 accent-[#b52025] rounded shrink-0 cursor-pointer"
              />
              <Coffee size={16} className="shrink-0 text-amber-700 dark:text-amber-400" />
              <span className="text-xs font-bold">{t('Kopi')}</span>
            </label>

            {/* Teh */}
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all min-h-[44px] select-none ${
                needTea
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={needTea}
                onChange={(e) => setNeedTea(e.target.checked)}
                className="w-4 h-4 accent-[#b52025] rounded shrink-0 cursor-pointer"
              />
              <CupSoda size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold">{t('Teh')}</span>
            </label>

            {/* Air Putih */}
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all min-h-[44px] select-none ${
                needWater
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={needWater}
                onChange={(e) => setNeedWater(e.target.checked)}
                className="w-4 h-4 accent-[#b52025] rounded shrink-0 cursor-pointer"
              />
              <Droplets size={16} className="shrink-0 text-sky-500 dark:text-sky-400" />
              <span className="text-xs font-bold">{t('Air Putih')}</span>
            </label>

            {/* Others */}
            <label
              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all min-h-[44px] select-none ${
                needOthers
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={needOthers}
                onChange={(e) => setNeedOthers(e.target.checked)}
                className="w-4 h-4 accent-[#b52025] rounded shrink-0 cursor-pointer"
              />
              <ListPlus size={16} className="shrink-0 text-brand-500" />
              <span className="text-xs font-bold">{t('Others')}</span>
            </label>
          </div>

          {needOthers && (
            <div className="pt-1">
              <input
                type="text"
                required
                className="input text-xs"
                placeholder={t('Ketik kebutuhan lainnya (contoh: Air Mineral, Snack, Proyektor, Spidol...)')}
                value={othersText}
                onChange={(e) => setOthersText(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Notes (Optional) */}
        <div>
          <label className="label">{t('Catatan Tambahan (Opsional)')}</label>
          <input
            type="text"
            className="input text-xs"
            placeholder="Input catatan meeting"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Link to="/" className="btn btn-ghost text-xs">
            {t('Batal')}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary text-xs sm:text-sm px-6"
          >
            <PlusCircle size={16} />
            <span>{submitting ? t('Memproses...') : t('Konfirmasi Reservasi')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
