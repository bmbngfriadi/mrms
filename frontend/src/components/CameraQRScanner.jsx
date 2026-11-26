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
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

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
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  const pickBestRearCamera = (devices) => {
    if (!devices || devices.length === 0) return null;
    // 1. Prefer standard Back Camera (avoid iOS "Back Triple/Dual/Ultra/Telephoto Camera" which often renders black on Safari)
    const standardBack = devices.find((c) => {
      const lbl = (c.label || '').toLowerCase();
      const isRear = lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment');
      const isMultiOrSpecial =
        lbl.includes('triple') ||
        lbl.includes('dual') ||
        lbl.includes('ultra') ||
        lbl.includes('telephoto') ||
        lbl.includes('macro');
      return isRear && !isMultiOrSpecial;
    });
    if (standardBack) return standardBack;

    // 2. Fallback to any rear camera excluding triple
    const nonTripleBack = devices.find((c) => {
      const lbl = (c.label || '').toLowerCase();
      return (lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment')) && !lbl.includes('triple');
    });
    if (nonTripleBack) return nonTripleBack;

    // 3. Fallback to any rear camera or first device
    const anyBack = devices.find((c) => {
      const lbl = (c.label || '').toLowerCase();
      return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment');
    });
    return anyBack || devices[0];
  };

  const enumerateCamerasSafely = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (isMountedRef.current && devices && devices.length > 0) {
        setCameras(devices);
        const bestCam = pickBestRearCamera(devices);
        setSelectedCameraId((prev) => prev || (bestCam ? bestCam.id : devices[0].id));
      }
      return devices || [];
    } catch {
      return [];
    }
  };

  const startScanningWithCamera = async (cameraIdOrFacing, isRetry = false) => {
    if (isStartingRef.current || !isMountedRef.current) return;
    isStartingRef.current = true;
    setErrorMsg('');

    try {
      // Only stop if actively scanning to preserve iOS Safari user-gesture activation
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await stopScanning();
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!isMountedRef.current) return;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const config = {
        fps: 12,
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
          if (isMountedRef.current) setScannedResult(cleanToken);

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

      // iOS Safari / iPhone PWA safeguard: explicitly ensure playsInline, muted, autoplay & play()
      let activeTrackLabel = '';
      try {
        const container = document.getElementById(scannerContainerId);
        const videoEl = container?.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('webkit-playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.playsInline = true;
          videoEl.muted = true;
          if (videoEl.paused) {
            videoEl.play().catch(() => {});
          }
          activeTrackLabel = videoEl.srcObject?.getVideoTracks?.()[0]?.label || '';
        }
      } catch {}

      if (isMountedRef.current) {
        setIsScanning(true);
        const devices = cameras.length === 0 ? await enumerateCamerasSafely() : cameras;

        // If started with facingMode and device list contains iOS Triple/Dual/Ultra Camera, auto-switch to standard "Back Camera"
        const hasMultiLens = devices.some((d) => /triple|dual|ultra/i.test(d.label || ''));
        if (
          !isRetry &&
          typeof cameraParam === 'object' &&
          devices.length > 1 &&
          (hasMultiLens || /triple|dual|ultra/i.test(activeTrackLabel))
        ) {
          const bestCam = pickBestRearCamera(devices);
          if (bestCam && !/triple|dual|ultra/i.test(bestCam.label || '')) {
            setSelectedCameraId(bestCam.id);
            await stopScanning();
            await new Promise((r) => setTimeout(r, 350));
            if (isMountedRef.current) {
              isStartingRef.current = false;
              await startScanningWithCamera(bestCam.id, true);
            }
            return;
          }
        }
      }
    } catch (err) {
      console.error('Camera startup error:', err);
      const errStr = String(err?.name || err?.message || err);

      // Automatic fallback if facingMode: environment fails with NotReadableError / OverconstrainedError
      if (
        !isRetry &&
        (err?.name === 'NotReadableError' ||
          err?.name === 'OverconstrainedError' ||
          errStr.includes('NotReadableError') ||
          errStr.includes('Could not start video source'))
      ) {
        isStartingRef.current = false;
        await new Promise((r) => setTimeout(r, 400));
        const devices = await enumerateCamerasSafely();
        if (devices.length > 0 && isMountedRef.current) {
          const fallbackCam = pickBestRearCamera(devices);
          setSelectedCameraId(fallbackCam.id);
          return startScanningWithCamera(fallbackCam.id, true);
        }
      }

      if (!isMountedRef.current) return;
      let msg = t('Gagal mengakses kamera.');
      if (err?.name === 'NotAllowedError' || errStr.includes('Permission')) {
        msg = t('Izin kamera ditolak. Harap izinkan akses kamera pada pengaturan browser Anda.');
      } else if (err?.name === 'NotFoundError' || errStr.includes('device not found')) {
        msg = t('Tidak ditemukan perangkat kamera pada perangkat ini.');
      } else if (err?.name === 'NotReadableError' || errStr.includes('NotReadableError') || errStr.includes('Could not start video source')) {
        msg = t('Kamera sedang digunakan aplikasi lain atau belum siap. Tutup aplikasi kamera lain lalu tekan "Coba Lagi", atau gunakan "Unggah Foto QR".');
      } else {
        msg = err?.message || String(err);
      }
      setErrorMsg(msg);
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Watch #mrms-camera-qr-reader for <video> insertion so iOS Safari gets playsInline/muted BEFORE playback starts
    const container = document.getElementById(scannerContainerId);
    let observer = null;
    const applyIosVideoAttrs = (videoEl) => {
      if (!videoEl) return;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.setAttribute('muted', 'true');
      videoEl.setAttribute('autoplay', 'true');
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.onloadedmetadata = () => {
        videoEl.play().catch(() => {});
      };
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    };

    if (container) {
      observer = new MutationObserver(() => {
        const videoEl = container.querySelector('video');
        if (videoEl) applyIosVideoAttrs(videoEl);
      });
      observer.observe(container, { childList: true, subtree: true });
    }

    // Start synchronously on mount so iOS Safari preserves user-gesture camera activation
    startScanningWithCamera({ facingMode: 'environment' });

    return () => {
      isMountedRef.current = false;
      if (observer) observer.disconnect();
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
      <div className="mt-3 relative rounded-xl overflow-hidden bg-black w-full aspect-square max-w-[340px] mx-auto">
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Viewfinder Target Overlays (Red-only clean frame) */}
        {isScanning && !scannedResult && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Target Box */}
            <div className="w-[72%] h-[72%] border-2 border-red-500/80 rounded-2xl relative shadow-[0_0_20px_rgba(181,32,37,0.35)]">
              {/* Red Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-xl" />

              {/* Scanning Red Line Laser */}
              <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[bounce_2s_infinite] shadow-[0_0_8px_#ef4444]" />
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-[11px] text-white font-medium border border-red-500/30">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
        {cameras.length > 1 ? (
          <select
            value={selectedCameraId}
            onChange={handleCameraChange}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 flex-1 min-w-[130px] truncate"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || `Kamera ${c.id.substring(0, 5)}`}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400 shrink-0" />
            <span>{t('Kamera Aktif')}</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            disabled={fileScanning}
            onClick={() => fileInputRef.current?.click()}
            className="btn bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs py-2 px-3 min-h-[38px] whitespace-nowrap"
            title={t('Pindai dari galeri / foto')}
          >
            <Image size={14} className="shrink-0" />
            <span>{fileScanning ? t('Membaca...') : t('Foto QR')}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await stopScanning();
              if (onClose) onClose();
            }}
            className="btn bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs py-2 px-3 min-h-[38px] whitespace-nowrap"
          >
            {t('Tutup')}
          </button>
        </div>
      </div>
    </div>
  );
}
