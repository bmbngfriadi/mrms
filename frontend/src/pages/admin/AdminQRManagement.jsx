import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useModal } from '../../context/ModalContext';
import { Printer, QrCode, RotateCcw, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import cemindoLogo from '../../assets/logo-cemindo.png';

export default function AdminQRManagement() {
  const { showConfirm, showAlert } = useModal();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotatingId, setRotatingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/qr/print-sheets');
      setSheets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load QR print sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handleRotate = async (roomId, roomName) => {
    const confirmed = await showConfirm({
      title: 'Rotasi Token QR Ruangan',
      message: `Yakin ingin merotasi token QR untuk ${roomName}? Seluruh QR fisik lama di pintu ruangan tidak akan berlaku lagi dan harus dicetak ulang.`,
      type: 'danger',
      confirmText: 'Rotasi Sekarang',
    });
    if (!confirmed) return;

    setRotatingId(roomId);
    setMessage('');
    try {
      await api.post(`/qr/rooms/${roomId}/rotate`);
      setMessage(`Token QR untuk ${roomName} berhasil dirotasi.`);
      fetchSheets();
      showAlert({
        title: 'Rotasi Berhasil',
        message: `Token QR untuk ${roomName} berhasil dirotasi. Silakan cetak ulang lembar QR baru.`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Merotasi Token',
        message: err.response?.data?.message || 'Gagal merotasi token QR ruangan.',
        type: 'danger',
      });
    } finally {
      setRotatingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Printer className="text-brand-500" size={24} />
            <span>Manajemen & Cetak Lembar QR Ruangan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Setiap ruangan memiliki dua QR permanen terpisah: QR Masuk (Check-In) dan QR Keluar (Check-Out).
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto flex items-center gap-2 shadow-md"
        >
          <Printer size={16} />
          <span>Cetak Seluruh Lembar QR (Print to PDF / Printer)</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Security Info Box */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 print:hidden space-y-1">
        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
          <QrCode size={16} className="text-brand-500" />
          <span>Standar Keamanan QR Code PT Cemindo Gemilang:</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Kode QR tidak menyimpan data pribadi karyawan atau nama pemesan; hanya membawa token identifikasi ruangan dan jenis aksi (Check-in atau Check-out). Database hanya memverifikasi hash kriptografi SHA-256. Jika lembar QR fisik di pintu rusak atau bocor, Administrator dapat menekan tombol Rotasi Token.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Menyiapkan lembar QR cetak...</div>
      ) : (
        <div className="space-y-8">
          {sheets.map((sheet) => (
            <div
              key={sheet.roomId}
              className="card p-6 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-sm print:shadow-none print:border-black print:page-break-after-always"
            >
              {/* Room Header Banner for Print */}
              <div className="border-b-2 border-brand-500 pb-3 mb-6 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={cemindoLogo}
                      alt="Semen Merah Putih"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-black text-brand-600 uppercase tracking-widest">
                      PT CEMINDO GEMILANG Tbk &bull; PLANT BATAM
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {sheet.name}
                    </h2>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin size={13} />
                      <span>{sheet.location} &bull; Kapasitas: {sheet.capacity} Orang</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRotate(sheet.roomId, sheet.name)}
                  disabled={rotatingId === sheet.roomId}
                  className="btn btn-ghost text-xs text-slate-500 hover:text-brand-600 print:hidden flex items-center gap-1"
                >
                  <RotateCcw size={13} className={rotatingId === sheet.roomId ? 'animate-spin' : ''} />
                  <span>Rotasi Token QR</span>
                </button>
              </div>

              {/* Dual QR Codes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 1. CHECK-IN QR */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 text-center flex flex-col items-center justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs uppercase tracking-wider mb-2">
                      QR CHECK-IN (MASUK)
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">Pintu Ruangan &bull; Saat Mulai Rapat</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                      Pindai QR ini saat tiba di ruangan. Toleransi keterlambatan maksimal 15 menit.
                    </p>
                  </div>

                  <div className="my-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                    <img
                      src={sheet.checkin.qrImage}
                      alt={`QR Check-in ${sheet.name}`}
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 break-all max-w-xs">
                    {sheet.checkin.url}
                  </div>
                </div>

                {/* 2. CHECK-OUT QR */}
                <div className="p-5 rounded-2xl border-2 border-rose-500 bg-rose-50/20 dark:bg-rose-950/10 text-center flex flex-col items-center justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider mb-2">
                      QR CHECK-OUT (SELESAI)
                    </span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">Pintu Ruangan &bull; Saat Rapat Selesai</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                      Pindai QR ini untuk melepaskan ruangan dan menghentikan status Occupied.
                    </p>
                  </div>

                  <div className="my-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm inline-block">
                    <img
                      src={sheet.checkout.qrImage}
                      alt={`QR Check-out ${sheet.name}`}
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 break-all max-w-xs">
                    {sheet.checkout.url}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400">
                PT Cemindo Gemilang Tbk &bull; Lembar Resmi QR Ruangan Plant Batam &bull; Dilarang menyalin tanpa izin HRGA
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
