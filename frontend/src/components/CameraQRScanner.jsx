import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, Zap, Image, Upload } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

// Helper to extract clean token from URL or raw text
export const extractCleanToken = (decodedText) => {
  if (!decodedText || typeof decodedText !== 'string') return '';
  const trimmed = decodedText.trim();
  if (trimmed.includes('code=') || trimmed.includes('token=')) {
    try {
      const dummyUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `http://dummy.com/${trimmed.replace(/^\/+/, '')}`;
      const url = new URL(dummyUrl);
      const code = url.searchParams.get('code') || url.searchParams.get('token');
      if (code) return code.trim();
    } catch {
      const match = trimmed.match(/[?&](?:code|token)=([^&#\s]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }
  return trimmed;
};

export default function CameraQRScanner({ onScanSuccess, mode = 'checkin', onClose }) {
  const { t } = useI18n();
  const scannerContainerId = 'mrms-camera-qr-reader';
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStoppingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scannedResult, setScannedResult] = useState('');
  const [fileScanning, setFileScanning] = useState(false);

  const stopScanning = async () => {
    if (html5QrCodeRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore already stopped warnings
      } finally {
        isStoppingRef.current = false;
      }
    }
    setIsScanning(false);
  };

  const startScanningWithCamera = async (cameraIdOrFacing) => {
    setErrorMsg('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.max(120, Math.floor(minDim * 0.72));
          return { width: edgeSize, height: edgeSize };
        },
      };

      const cameraParam = cameraIdOrFacing || { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraParam,
        config,
        async (decodedText) => {
          const cleanToken = extractCleanToken(decodedText);
          setScannedResult(cleanToken);

          if (navigator.vibrate) {
            try {
              navigator.vibrate(100);
            } catch {}
          }

          await stopScanning();
          if (onScanSuccess) {
            onScanSuccess(cleanToken);
          }
        },
        () => {
          // Frame error (normal when QR not yet recognized)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera startup error:', err);
      let msg = t('Gagal mengakses kamera.');
      if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
        msg = t('Izin kamera ditolak. Harap izinkan akses kamera pada browser Anda.');
      } else if (err.name === 'NotFoundError' || String(err).includes('device not found')) {
        msg = t('Tidak ditemukan perangkat kamera pada perangkat ini.');
      } else {
        msg = err.message || String(err);
      }
      setErrorMsg(msg);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    // Start directly with environment (rear) camera
    startScanningWithCamera({ facingMode: 'environment' });

    // Enumerate cameras after prompt
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          );
          if (backCam) {
            setSelectedCameraId(backCam.id);
          } else {
            setSelectedCameraId(devices[0].id);
          }
        }
      })
      .catch(() => {
        // camera enumeration silently ignored if permission requested on start
      });

    return () => {
      stopScanning();
    };
  }, []);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanningWithCamera(newId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setFileScanning(true);

    try {
      await stopScanning();
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      const cleanToken = extractCleanToken(decodedText);
      setScannedResult(cleanToken);

      if (onScanSuccess) {
        onScanSuccess(cleanToken);
      }
    } catch (err) {
      console.error('File scan error:', err);
      setErrorMsg(t('Tidak dapat mendeteksi kode QR dari gambar yang diunggah. Pastikan gambar jelas dan tidak buram.'));
      // Resume camera
      startScanningWithCamera(selectedCameraId || { facingMode: 'environment' });
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-2xl relative overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-brand-500 animate-pulse" />
          <h3 className="font-bold text-sm">
            {mode === 'checkin' ? t('Scan Kamera QR Check-In') : t('Scan Kamera QR Check-Out')}
          </h3>
        </div>
        <button
          type="button"
          onClick={async () => {
            await stopScanning();
            if (onClose) onClose();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={t('Tutup')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">{t('Akses Kamera / Pemindaian')}</div>
            <div className="text-[11px] opacity-90">{errorMsg}</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => startScanningWithCamera(selectedCameraId || { facingMode: 'environment' })}
                className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>{t('Coba Lagi')}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1"
              >
                <Upload size={12} />
                <span>{t('Unggah Foto QR')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Live Viewfinder Container */}
      <div className="mt-3 relative rounded-xl overflow-hidden bg-black aspect-square max-h-[300px] mx-auto flex items-center justify-center">
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Viewfinder Target Overlays */}
        {isScanning && !scannedResult && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {/* Pulsing Target Box */}
            <div className="w-[70%] h-[70%] border-2 border-brand-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(181,32,37,0.4)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />

              {/* Scanning Red Line Laser */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-[bounce_2s_infinite] shadow-[0_0_8px_#b52025]" />
            </div>
            <div className="mt-4 px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-[11px] text-white font-medium border border-white/20">
              {t('Arahkan kamera ke lembar QR ruangan')}
            </div>
          </div>
        )}

        {/* Scanned Success Badge */}
        {scannedResult && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-4">
            <CheckCircle2 size={42} className="text-emerald-400 animate-bounce mb-2" />
            <div className="font-bold text-sm text-white">{t('QR Berhasil Terbaca!')}</div>
            <div className="font-mono text-xs text-emerald-300 mt-1 break-all max-w-[240px]">
              {scannedResult}
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for Image QR Scan */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Camera Selection & Alternative Controls */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
        {cameras.length > 1 ? (
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[150px] truncate"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Kamera ${c.id.substring(0, 5)}`}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap size={13} className="text-amber-400" />
            <span>{t('Kamera Aktif')}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={fileScanning}
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost text-xs text-slate-300 hover:text-white py-1 px-2.5 flex items-center gap-1"
            title={t('Pindai dari galeri / foto')}
          >
            <Image size={13} />
            <span>{fileScanning ? t('Membaca...') : t('Foto QR')}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await stopScanning();
              if (onClose) onClose();
            }}
            className="btn btn-ghost text-xs text-slate-400 hover:text-white py-1 px-2.5"
          >
            {t('Tutup')}
          </button>
        </div>
      </div>
    </div>
  );
}
