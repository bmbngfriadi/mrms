import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useModal } from '../../context/ModalContext';
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Wifi,
  WifiOff,
  Phone,
  Activity,
  LogOut,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function WhatsAppGateway() {
  const { t } = useI18n();
  const { showConfirm, showAlert } = useModal();
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testConnResult, setTestConnResult] = useState(null);

  // Test Send Message State
  const [testPhone, setTestPhone] = useState('081270001001');
  const [testMessage, setTestMessage] = useState(
    'Halo! Ini adalah pesan uji coba dari WhatsApp Gateway Meeting Room Management System (MRMS) - PT Cemindo Gemilang Tbk Plant Batam.'
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState(null);
  const [sendError, setSendError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setGatewayStatus(res.data.data);
    } catch (err) {
      console.error('Failed to fetch WA gateway status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds for real-time QR updates and connection changes
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setTestConnResult(null);
    try {
      const res = await api.post('/whatsapp/connect');
      setGatewayStatus(res.data.data);
    } catch (err) {
      showAlert({
        title: 'Koneksi Gagal',
        message: err.response?.data?.message || 'Gagal memulai koneksi WhatsApp.',
        type: 'danger',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await showConfirm({
      title: 'Putuskan Sesi WhatsApp',
      message: 'Apakah Anda yakin ingin memutuskan sesi WhatsApp Gateway? Seluruh pengiriman notifikasi otomatis akan tertunda sampai perangkat dipasangkan kembali.',
      type: 'danger',
      confirmText: 'Putus Sesi',
    });
    if (!confirmed) return;

    try {
      const res = await api.post('/whatsapp/disconnect', { clearSession: true });
      setGatewayStatus(res.data.data);
      setTestConnResult(null);
      setTestSendResult(null);
      showAlert({
        title: 'Sesi Diputuskan',
        message: 'Sesi WhatsApp Gateway berhasil diputuskan.',
        type: 'info',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Memutuskan',
        message: err.response?.data?.message || 'Gagal memutuskan WhatsApp.',
        type: 'danger',
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestConnResult(null);
    try {
      const res = await api.post('/whatsapp/test-connection');
      setTestConnResult(res.data.data);
    } catch (err) {
      setTestConnResult({
        success: false,
        message: err.response?.data?.message || 'Tes koneksi gagal.',
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    setSendError('');
    setTestSendResult(null);
    setSendingTest(true);

    try {
      const res = await api.post('/whatsapp/test-send', {
        phone: testPhone,
        message: testMessage,
      });
      setTestSendResult(res.data.data);
    } catch (err) {
      setSendError(err.response?.data?.message || 'Gagal mengirim pesan uji coba.');
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = gatewayStatus?.isConnected || gatewayStatus?.status === 'CONNECTED';
  const isQrReady = gatewayStatus?.status === 'QR_READY';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Baileys WhatsApp Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            WhatsApp Gateway Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Layanan pengiriman notifikasi, pengingat jadwal, dan kode OTP berbasis WhatsApp Web Socket (Baileys).
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="btn btn-ghost text-xs self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('Segarkan')}</span>
        </button>
      </div>

      {/* Gateway Status Banner Card */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isConnected
                  ? 'bg-emerald-500 text-white'
                  : isQrReady
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isConnected ? <Wifi size={24} /> : isQrReady ? <QrCode size={24} /> : <WifiOff size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-800 dark:text-white">
                  Status Gateway:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isConnected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : isQrReady
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {gatewayStatus?.status || 'MEMERIKSA...'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {isConnected
                  ? `Terhubung sebagai ${gatewayStatus?.profileName || 'MRMS Bot'} (${gatewayStatus?.phoneNumber || '-'})`
                  : isQrReady
                  ? 'QR Code siap dipindai melalui aplikasi WhatsApp di ponsel Anda.'
                  : 'Gateway saat ini belum aktif. Klik "Hubungkan Gateway" di bawah.'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isConnected && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Wifi size={14} />
                <span>{connecting ? 'Menghubungkan...' : 'Hubungkan Gateway'}</span>
              </button>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testingConn}
              className="btn btn-ghost text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Activity size={14} className={testingConn ? 'animate-spin' : 'text-brand-500'} />
              <span>{testingConn ? 'Memeriksa...' : 'Coba Koneksi'}</span>
            </button>

            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="btn btn-ghost text-rose-500 hover:bg-rose-50 text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span>Putus Sesi</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Connection Output Diagnostic */}
        {testConnResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
              testConnResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            }`}
          >
            {testConnResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{testConnResult.message}</div>
              {testConnResult.latencyMs !== undefined && (
                <div className="text-[11px] opacity-80 mt-0.5">
                  Latency Server: <strong>{testConnResult.latencyMs} ms</strong> &bull; Nomor: <strong>{testConnResult.phoneNumber || '-'}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* LEFT COL: QR CODE PAIRING PANEL                               */}
        {/* ============================================================== */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <QrCode size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Penyandingan Perangkat WhatsApp (Pairing QR)
            </h3>
          </div>

          {isConnected ? (
            <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="font-black text-slate-800 dark:text-white text-base">
                WhatsApp Siap Digunakan
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Gateway telah terautentikasi dan siap mengirimkan notifikasi booking, pengingat 20 menit sebelum meeting, dan kode OTP reset password ke karyawan.
              </p>
            </div>
          ) : isQrReady && gatewayStatus?.qrDataUrl ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block mx-auto">
                <img
                  src={gatewayStatus.qrDataUrl}
                  alt="WhatsApp Baileys QR Code"
                  className="w-56 h-56 mx-auto"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="font-bold text-slate-800 dark:text-white">Langkah Menghubungkan:</div>
                <div>1. Buka aplikasi <strong>WhatsApp</strong> di smartphone Anda.</div>
                <div>2. Pilih menu <strong>Perangkat Tertaut (Linked Devices)</strong>.</div>
                <div>3. Ketuk <strong>Tautkan Perangkat</strong> lalu arahkan kamera ke QR di atas.</div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                <QrCode size={28} />
              </div>
              <p className="text-xs text-slate-500">
                Belum ada sesi aktif. Tekan tombol <strong>Hubungkan Gateway</strong> untuk memunculkan QR Code pairing.
              </p>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT COL: FITUR COBA KIRIM PESAN WHATSAPP                     */}
        {/* ============================================================== */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Send size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Coba Kirim Pesan WhatsApp
            </h3>
          </div>

          <form onSubmit={handleSendTestMessage} className="space-y-3.5">
            <div>
              <label className="label">Nomor WhatsApp Penerima</label>
              <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-3.5 pr-3 py-2">
                <Phone size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="Input nomor WhatsApp tujuan"
                  className="w-full bg-transparent pl-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Isi Pesan Uji Coba</label>
              <textarea
                rows="4"
                required
                placeholder="Input isi pesan WhatsApp"
                className="input text-xs resize-none py-2"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            {sendError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {testSendResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Pesan Berhasil Dikirim!</span>
                </div>
                <div className="text-[11px] opacity-80">
                  Tujuan: <strong>{testSendResult.recipient}</strong> &bull; Status: <strong>{testSendResult.status}</strong>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sendingTest}
              className="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2"
            >
              <Send size={15} />
              <span>{sendingTest ? 'Mengirim Pesan...' : 'Kirim Pesan WhatsApp Sekarang'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

