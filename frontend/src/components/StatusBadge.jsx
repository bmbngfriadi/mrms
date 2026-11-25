import React from 'react';
import { useI18n } from '../context/I18nContext';

export default function StatusBadge({ status, type = 'booking' }) {
  const { t } = useI18n();
  const normalized = (status || '').toUpperCase();

  const configs = {
    // Booking statuses
    CONFIRMED: { label: 'Terkonfirmasi', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    CHECKED_IN: { label: 'Sedang Berlangsung', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    COMPLETED: { label: 'Selesai', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
    CANCELLED: { label: 'Dibatalkan', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
    NO_SHOW_PENDING: { label: 'Terlambat (>15m)', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    NO_SHOW: { label: 'No Show', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' },

    // Room & Session live statuses
    AVAILABLE: { label: 'Tersedia', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    OCCUPIED: { label: 'Digunakan (Occupied)', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
    RESERVED: { label: 'Dipesan (Reserved)', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    OVERDUE: { label: 'OVERDUE', bg: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-extrabold animate-pulse' },
    MAINTENANCE: { label: 'Maintenance', bg: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
    BLOCKED: { label: 'Diblokir', bg: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
    INACTIVE: { label: 'Non-aktif', bg: 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-500 border-slate-200 dark:border-slate-800' },
  };

  const config = configs[normalized] || {
    label: normalized || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${config.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(config.label)}
    </span>
  );
}
