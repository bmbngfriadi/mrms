import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShieldCheck, Search, RefreshCw, Eye, X } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit?page=${page}&limit=25`;
      if (search) url += `&search=${search}`;
      const res = await api.get(url);
      setLogs(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-brand-500" size={24} />
            <span>Audit Trail & Log Keamanan Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pencatatan menyeluruh terhadap seluruh aktivitas kritis, perubahan data, dan otorisasi.
          </p>
        </div>
        <button onClick={fetchAuditLogs} className="btn btn-ghost text-xs flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCw size={14} />
          <span>Segarkan</span>
        </button>
      </div>

      <div className="card p-3.5 flex items-center gap-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          className="input border-0 focus:ring-0 p-0 text-xs min-h-0"
          placeholder="Input pencarian audit log"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content: High-Density Table on Desktop / Responsive Card List on Mobile */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat audit log...</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">Belum ada audit log tercatat.</div>
      ) : (
        <>
          {/* DESKTOP VIEW (hidden md:block) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="th">Waktu (WIB)</th>
                  <th className="th">Aksi</th>
                  <th className="th">Pengguna / Aktor</th>
                  <th className="th">Resource</th>
                  <th className="th">IP Address</th>
                  <th className="th text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="td font-bold text-slate-800 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="td">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {log.user?.name || 'Sistem / Anonim'}
                      </div>
                      <div className="text-[10px] text-slate-400">{log.user?.role || '-'}</div>
                    </td>
                    <td className="td font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="td font-mono text-[11px] text-slate-400">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="td text-right">
                      <button
                        onClick={() => setDetailModal(log)}
                        className="btn btn-ghost text-xs py-1 px-2.5 min-h-0"
                      >
                        <Eye size={12} />
                        <span>Inspeksi</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="card p-4 space-y-2.5 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-brand-600 dark:text-brand-400">
                    {log.action}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Aktor
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                      {log.user?.name || 'Sistem / Anonim'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{log.user?.role || '-'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Target / Resource
                    </span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block truncate mt-0.5">
                      {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      IP: {log.ipAddress || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                  <span>{new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <button
                    type="button"
                    onClick={() => setDetailModal(log)}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Inspeksi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Detail Audit Log</h3>
                <p className="text-xs text-slate-400">{detailModal.action} &bull; {new Date(detailModal.createdAt).toLocaleString('id-ID')}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-bold mb-1">User Agent:</span>
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] break-all">
                  {detailModal.userAgent || '-'}
                </div>
              </div>

              {detailModal.oldValues && (
                <div>
                  <span className="text-slate-400 block font-bold mb-1">Nilai Lama (Previous Values):</span>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] overflow-x-auto max-h-40">
                    {JSON.stringify(detailModal.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {detailModal.newValues && (
                <div>
                  <span className="text-slate-400 block font-bold mb-1">Nilai Baru (New Values):</span>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] overflow-x-auto max-h-40">
                    {JSON.stringify(detailModal.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setDetailModal(null)} className="btn btn-ghost text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
