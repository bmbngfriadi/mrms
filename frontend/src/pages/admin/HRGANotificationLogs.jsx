import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BellRing, Mail, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function HRGANotificationLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState(null);
  const [retryMessage, setRetryMessage] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/notifications/logs?page=${page}&limit=25`;
      if (channel) url += `&channel=${channel}`;
      if (status) url += `&status=${status}`;

      const res = await api.get(url);
      setLogs(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load notification logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, channel, status]);

  const handleRetry = async (logId, outboxId) => {
    const targetId = outboxId || logId;
    setRetryingId(targetId);
    setRetryMessage('');
    try {
      await api.post(`/notifications/${targetId}/retry`);
      setRetryMessage('Notifikasi berhasil dijadwalkan ulang!');
      fetchLogs();
    } catch (err) {
      setRetryMessage(err.response?.data?.message || 'Gagal menjadwalkan ulang notifikasi.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleTestEmail = async () => {
    const target = prompt('Masukkan alamat email tujuan tes:', 'batam.cg@gmail.com');
    if (!target) return;

    setTestingEmail(true);
    setTestEmailResult('');
    try {
      const res = await api.post('/notifications/test-email', { recipient: target });
      setTestEmailResult(res.data.message || `Email tes berhasil dikirim ke ${target}`);
      fetchLogs();
    } catch (err) {
      setTestEmailResult(err.response?.data?.message || 'Gagal mengirim email tes.');
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <BellRing className="text-brand-500" size={24} />
            <span>Log Notifikasi Email & WhatsApp</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit pengiriman notifikasi otomatis kepada pemesan dan tim HRGA Plant Batam.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Mail size={14} />
            <span>{testingEmail ? 'Mengirim Email...' : 'Coba Kirim Email'}</span>
          </button>
          <button
            onClick={fetchLogs}
            className="btn btn-ghost text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {testEmailResult && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{testEmailResult}</span>
        </div>
      )}

      {/* Mode Alert Box */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Informasi Status Integrasi Provider:</div>
          <p className="text-[11px] opacity-90 mt-0.5">
            Jika sistem berjalan dalam mode <strong>Mock (NOTIFICATION_MODE=mock)</strong>, seluruh alur notifikasi dieksekusi end-to-end dan dicatat di database, namun pesan <strong>TIDAK BENAR-BENAR TERKIRIM</strong> ke server SMTP atau WhatsApp eksternal. Ubah mode ke production di file <code>.env</code> jika kredensial resmi telah tersedia.
          </p>
        </div>
      </div>

      {retryMessage && (
        <div className="p-3 rounded-xl bg-blue-50 text-blue-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{retryMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div className="card p-3.5 flex flex-wrap items-center gap-3">
        <select
          className="input sm:w-44 text-xs font-bold"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Channel</option>
          <option value="EMAIL">Email Saja</option>
          <option value="WHATSAPP">WhatsApp Saja</option>
        </select>

        <select
          className="input sm:w-44 text-xs font-bold"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Status</option>
          <option value="SENT">Terkirim (Production)</option>
          <option value="MOCK_SENT">Terkirim (Mock Mode)</option>
          <option value="FAILED">Gagal Kirim</option>
        </select>

        <span className="text-xs text-slate-400 ml-auto font-bold">
          Total: {total} log terdaftar
        </span>
      </div>

      {/* Content: High-Density Table on Desktop / Responsive Card List on Mobile */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat log notifikasi...</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">Belum ada log notifikasi tercatat.</div>
      ) : (
        <>
          {/* DESKTOP VIEW (hidden md:block) */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="th">Waktu Kirim</th>
                  <th className="th">Channel</th>
                  <th className="th">Event Notifikasi</th>
                  <th className="th">Tujuan Penerima</th>
                  <th className="th">Status & Respons Provider</th>
                  <th className="th text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isFailed = log.status === 'FAILED';
                  const isMock = log.isMock || log.status === 'MOCK_SENT';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="td whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="td whitespace-nowrap">
                        {log.channel === 'EMAIL' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                            <Mail size={12} />
                            EMAIL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            <MessageSquare size={12} />
                            WHATSAPP
                          </span>
                        )}
                      </td>
                      <td className="td font-bold text-slate-700 dark:text-slate-200">
                        {log.eventType}
                      </td>
                      <td className="td font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {log.recipient}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {isFailed ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              FAILED
                            </span>
                          ) : isMock ? (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px]">
                              MOCK SIMULATED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              SENT (LIVE)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {log.errorMessage || log.providerResponse || '-'}
                        </div>
                      </td>
                      <td className="td text-right">
                        {isFailed && log.outboxId && (
                          <button
                            onClick={() => handleRetry(log.id, log.outboxId)}
                            disabled={retryingId === log.outboxId}
                            className="btn btn-ghost text-xs py-1 px-2.5 min-h-0 text-brand-600 hover:text-brand-700"
                          >
                            <RotateCcw size={12} className={retryingId === log.outboxId ? 'animate-spin' : ''} />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {logs.map((log) => {
              const isFailed = log.status === 'FAILED';
              const isMock = log.isMock || log.status === 'MOCK_SENT';

              return (
                <div
                  key={log.id}
                  className="card p-4 space-y-2.5 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {log.channel === 'EMAIL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                          <Mail size={11} />
                          EMAIL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                          <MessageSquare size={11} />
                          WHATSAPP
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      {isFailed ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                          FAILED
                        </span>
                      ) : isMock ? (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px]">
                          MOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          SENT (LIVE)
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Event
                    </span>
                    <strong className="text-slate-900 dark:text-white text-xs block mt-0.5">
                      {log.eventType}
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs flex flex-col gap-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                        Penerima
                      </span>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold truncate block mt-0.5">
                        {log.recipient}
                      </span>
                    </div>

                    {(log.errorMessage || log.providerResponse) && (
                      <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg mt-1 break-all">
                        {log.errorMessage || log.providerResponse}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                    <span>{new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {isFailed && log.outboxId && (
                      <button
                        onClick={() => handleRetry(log.id, log.outboxId)}
                        disabled={retryingId === log.outboxId}
                        className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-bold text-brand-600 cursor-pointer"
                      >
                        <RotateCcw size={12} className={retryingId === log.outboxId ? 'animate-spin' : ''} />
                        <span>Retry Kirim</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
