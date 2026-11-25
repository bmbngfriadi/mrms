import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useModal } from '../../context/ModalContext';
import api from '../../services/api';
import { Settings, Save, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function AdminSettings() {
  const { t } = useI18n();
  const { showConfirm, showAlert } = useModal();
  const [settings, setSettings] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add Recipient Modal
  const [recName, setRecName] = useState('');
  const [recEmail, setRecEmail] = useState('');
  const [recPhone, setRecPhone] = useState('');
  const [recChannel, setRecChannel] = useState('ALL');

  const fetchSettingsAndRecipients = async () => {
    setLoading(true);
    try {
      const [setRes, recRes] = await Promise.all([
        api.get('/settings'),
        api.get('/notifications/recipients'),
      ]);

      const map = {};
      (setRes.data.data || []).forEach((item) => {
        map[item.key] = item.value;
      });
      setSettings(map);
      setRecipients(recRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndRecipients();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const payload = Object.keys(settings).map((key) => ({
      key,
      value: String(settings[key]),
    }));

    try {
      await api.put('/settings', { settings: payload });
      setMessage(t('Pengaturan operasional sistem berhasil disimpan!'));
    } catch (err) {
      setError(err.response?.data?.message || t('Gagal menyimpan pengaturan.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications/recipients', {
        name: recName,
        email: recEmail || null,
        phone: recPhone || null,
        channel: recChannel,
      });
      setRecName('');
      setRecEmail('');
      setRecPhone('');
      fetchSettingsAndRecipients();
      showAlert({
        title: 'Berhasil',
        message: 'Penerima notifikasi HRGA berhasil ditambahkan.',
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Menambahkan',
        message: err.response?.data?.message || t('Gagal menambahkan penerima notifikasi.'),
        type: 'danger',
      });
    }
  };

  const handleDeleteRecipient = async (id, name) => {
    const confirmed = await showConfirm({
      title: 'Hapus Penerima Notifikasi',
      message: `Hapus ${name || 'petugas ini'} dari daftar penerima notifikasi email dan WhatsApp HRGA?`,
      type: 'danger',
      confirmText: 'Hapus',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/notifications/recipients/${id}`);
      fetchSettingsAndRecipients();
      showAlert({
        title: 'Berhasil',
        message: 'Penerima notifikasi berhasil dihapus.',
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || t('Gagal menghapus penerima.'),
        type: 'danger',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Settings className="text-brand-500" size={24} />
          <span>{t('Pengaturan Sistem')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {t('Konfigurasi parameter operasional ruang meeting PT Cemindo Gemilang Tbk – Plant Batam.')}
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('Memuat data...')}</div>
      ) : (
        <div className="space-y-6">
          {/* Main Operational Settings Form */}
          <form onSubmit={handleSaveSettings} className="card p-6 space-y-5">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {t('Pengaturan Operasional')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="label">{t('Jam Operasional')} ({t('Mulai')})</label>
                <input
                  type="time"
                  className="input font-bold"
                  value={settings['OPERATIONAL_HOURS_START'] || '08:00'}
                  onChange={(e) => handleChange('OPERATIONAL_HOURS_START', e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Jam Operasional')} ({t('Selesai')})</label>
                <input
                  type="time"
                  className="input font-bold"
                  value={settings['OPERATIONAL_HOURS_END'] || '17:00'}
                  onChange={(e) => handleChange('OPERATIONAL_HOURS_END', e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Toleransi Check-In')} ({t('Menit')})</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  className="input font-bold"
                  value={settings['LATE_TOLERANCE_MINUTES'] || '15'}
                  onChange={(e) => handleChange('LATE_TOLERANCE_MINUTES', e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Pengingat Sebelum Mulai')} ({t('Menit')})</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  className="input font-bold"
                  value={settings['REMINDER_MINUTES_BEFORE'] || '20'}
                  onChange={(e) => handleChange('REMINDER_MINUTES_BEFORE', e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Durasi Maksimum')} ({t('Menit')})</label>
                <input
                  type="number"
                  min="30"
                  max="480"
                  className="input font-bold"
                  value={settings['DURATION_MAX_MINUTES'] || '240'}
                  onChange={(e) => handleChange('DURATION_MAX_MINUTES', e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Batas Booking')} ({t('Hari')})</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  className="input font-bold"
                  value={settings['BOOKING_HORIZON_DAYS'] || '30'}
                  onChange={(e) => handleChange('BOOKING_HORIZON_DAYS', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">{t('Mode Notifikasi')} (Email & WhatsApp)</label>
                <select
                  className="input font-bold"
                  value={settings['NOTIFICATION_MODE'] || 'mock'}
                  onChange={(e) => handleChange('NOTIFICATION_MODE', e.target.value)}
                >
                  <option value="mock">MOCK MODE (Pesan dicatat di DB, tidak terkirim keluar)</option>
                  <option value="production">PRODUCTION LIVE (Mengirim ke SMTP & WhatsApp API resmi)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5"
              >
                <Save size={16} />
                <span>{saving ? t('Memproses...') : t('Simpan Perubahan')}</span>
              </button>
            </div>
          </form>

          {/* HRGA Notification Recipients Panel */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {t('Penerima HRGA')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('Setiap aktivitas booking, check-in, late arrival, overdue, dan checkout akan dikirimkan ke kontak HRGA di bawah ini.')}
            </p>

            <form onSubmit={handleAddRecipient} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                required
                className="input text-xs"
                placeholder="Input nama petugas HRGA"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
              />
              <input
                type="email"
                className="input text-xs"
                placeholder="Input email notifikasi"
                value={recEmail}
                onChange={(e) => setRecEmail(e.target.value)}
              />
              <input
                type="text"
                className="input text-xs"
                placeholder="Input nomor WhatsApp"
                value={recPhone}
                onChange={(e) => setRecPhone(e.target.value)}
              />
              <button type="submit" className="btn btn-primary text-xs flex items-center justify-center gap-1">
                <Plus size={14} />
                <span>{t('Tambah')}</span>
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {recipients.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-slate-800 dark:text-white">{rec.name}</strong>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Email: {rec.email || '-'} &bull; WA: {rec.phone || '-'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipient(rec.id, rec.name)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
