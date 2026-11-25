import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import api from '../../services/api';
import {
  FileBarChart,
  Download,
  Calendar,
  Building2,
  DoorOpen,
  HelpCircle,
  Clock,
  Users,
} from 'lucide-react';

export default function HRGAReports() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('UTILIZATION');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [utilizationData, setUtilizationData] = useState(null);
  const [departmentData, setDepartmentData] = useState([]);
  const [roomUsageData, setRoomUsageData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'UTILIZATION') {
        const res = await api.get(`/reports/room-utilization?startDate=${startDate}&endDate=${endDate}`);
        setUtilizationData(res.data.data);
      } else if (activeTab === 'DEPARTMENT') {
        const res = await api.get(`/reports/department-usage?startDate=${startDate}&endDate=${endDate}`);
        setDepartmentData(res.data.data || []);
      } else if (activeTab === 'USAGE') {
        const res = await api.get(`/reports/room-usage?startDate=${startDate}&endDate=${endDate}`);
        setRoomUsageData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, startDate, endDate]);

  const [downloading, setDownloading] = useState(false);

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const res = await api.get(
        `/reports/room-usage?startDate=${startDate}&endDate=${endDate}&format=xlsx`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_MRMS_Plant_Batam_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Excel report:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FileBarChart className="text-brand-500" size={24} />
            <span>{t('Laporan & Utilisasi')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Laporan utilisasi ruangan, departemen, dan rekapitulasi operasional Plant Batam.')}
          </p>
        </div>

        {/* Export Excel Button (Clean, Detailed Corporate Excel Spreadsheet) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="btn bg-[#059669] hover:bg-[#047857] text-white text-xs py-2.5 px-4 font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download size={15} className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? t('Menyiapkan Excel...') : t('Unduh Laporan Excel (.xlsx)')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Range Controls */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Report Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('UTILIZATION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'UTILIZATION'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('Tingkat Okupansi')} (%)
          </button>
          <button
            onClick={() => setActiveTab('DEPARTMENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'DEPARTMENT'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('Penggunaan per Departemen')}
          </button>
          <button
            onClick={() => setActiveTab('USAGE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'USAGE'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('Rekap Detail Seluruh Sesi')}
          </button>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input text-xs font-bold py-1 px-2 w-36"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-slate-400 text-xs">-</span>
          <input
            type="date"
            className="input text-xs font-bold py-1 px-2 w-36"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('Memuat data...')}</div>
      ) : activeTab === 'UTILIZATION' ? (
        <div className="space-y-4">
          {/* Formula Explanation Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <HelpCircle size={15} className="text-brand-500" />
              <span>{t('Standar Rumus Perhitungan Utilisasi Ruangan:')}</span>
            </div>
            <div className="font-mono p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-brand-600 dark:text-brand-400 font-bold">
              {utilizationData?.formula || 'Utilization (%) = (Actual Usage Hours / Available Operational Hours) x 100%'}
            </div>
            <p className="text-slate-500 text-[11px]">
              {utilizationData?.formulaExplanation}
            </p>
          </div>

          {/* Utilization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {utilizationData?.report?.map((r) => (
              <div key={r.roomId} className="card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{r.roomCode}</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">{r.roomName}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{r.capacity} {t('Orang')}</span>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-slate-500 font-bold">{t('Tingkat Okupansi')}:</span>
                    <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
                      {r.utilizationPercentage}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${r.utilizationPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span>{t('Penggunaan Aktual')}:</span>
                    <strong className="text-slate-700 dark:text-slate-200">{r.actualUsageHours} {t('Jam')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Jam Operasional')}:</span>
                    <strong className="text-slate-700 dark:text-slate-200">{r.availableOperationalHours} {t('Jam')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Total Pemesanan')}:</span>
                    <strong className="text-slate-700 dark:text-slate-200">{r.totalBookings}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'DEPARTMENT' ? (
        <>
          {/* DESKTOP VIEW (hidden md:block) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th">{t('Departemen')}</th>
                  <th className="th">{t('Total Pemesanan')}</th>
                  <th className="th">{t('Durasi')}</th>
                  <th className="th">{t('Jumlah Peserta')}</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((d) => (
                  <tr key={d.departmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td">
                      <span className="font-mono text-[10px] text-slate-400 font-bold mr-2">{d.code}</span>
                      <strong className="text-slate-800 dark:text-white">{d.name}</strong>
                    </td>
                    <td className="td font-bold text-slate-700 dark:text-slate-200">{d.totalBookings}</td>
                    <td className="td font-black text-brand-600 dark:text-brand-400">{d.totalUsageHours} {t('Jam')}</td>
                    <td className="td text-slate-600 dark:text-slate-300">{d.totalAttendees} {t('orang')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {departmentData.map((d) => (
              <div
                key={d.departmentId}
                className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded">
                      {d.code}
                    </span>
                    <strong className="text-slate-900 dark:text-white text-sm font-bold block mt-1 truncate">
                      {d.name}
                    </strong>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Pemesanan</span>
                    <span className="text-base font-black text-slate-800 dark:text-white">
                      {d.totalBookings}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Total Durasi
                    </span>
                    <span className="font-black text-brand-600 dark:text-brand-400 text-sm block mt-0.5">
                      {d.totalUsageHours} {t('Jam')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Total Peserta
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm block mt-0.5">
                      {d.totalAttendees} {t('orang')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* DESKTOP VIEW (hidden md:block) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th">{t('Kode / Agenda')}</th>
                  <th className="th">{t('Ruangan')}</th>
                  <th className="th">{t('Pemesan')}</th>
                  <th className="th">{t('Jadwal Rencana')}</th>
                  <th className="th">{t('Waktu Masuk')} / {t('Waktu Selesai')}</th>
                  <th className="th">{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {roomUsageData.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <td className="td">
                      <div className="font-mono text-[10px] text-slate-400 font-bold">{r.bookingCode}</div>
                      <div className="font-bold text-slate-800 dark:text-white">{r.agenda}</div>
                    </td>
                    <td className="td font-semibold text-slate-700 dark:text-slate-300">{r.roomName}</td>
                    <td className="td">
                      <div className="font-bold text-slate-700 dark:text-slate-200">{r.bookerName}</div>
                      <div className="text-[11px] text-slate-400">{r.department}</div>
                    </td>
                    <td className="td">
                      <div>{r.plannedStart}</div>
                      <div className="text-slate-400">- {r.plannedEnd}</div>
                    </td>
                    <td className="td">
                      <div>{t('Masuk')}: {r.actualCheckin}</div>
                      <div className="text-slate-400">{t('Keluar')}: {r.actualCheckout}</div>
                      {r.isManualCheckout && (
                        <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                          [Manual by {r.manualCheckoutOfficer}]
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <span className="font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {t(r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {roomUsageData.map((r) => (
              <div
                key={r.id}
                className="card p-4 space-y-2.5 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 font-bold block">
                      {r.bookingCode}
                    </span>
                    <strong className="text-slate-900 dark:text-white text-sm font-bold block truncate mt-0.5">
                      {r.agenda}
                    </strong>
                    <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                      {r.roomName}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {t(r.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Pemesan
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                      {r.bookerName}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {r.department}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Jadwal Rencana
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                      {r.plannedStart}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      - {r.plannedEnd}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Realisasi Check-in / Out:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                      {r.actualCheckin} &rarr; {r.actualCheckout}
                    </span>
                  </div>
                  {r.isManualCheckout && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded font-bold">
                      Manual Checkout
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
