import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, Zap, Image, Upload } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

// Helper to extract clean token from URL or raw text
export const extractCleanToken = (decodedText) => {
  if (!decodedText || typeof decodedText !== 'string') return '';
  const trimmed = decodedText.trim();
  if (trimmed.includes('code=') || trimmed.includes('token=')) {
    try {
      const dummyUrl =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
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

const pickBestRearCamera = (devices) => {
  if (!devices || devices.length === 0) return null;
  // Prefer standard Back Camera (avoid iOS "Back Triple/Dual/Ultra/Telephoto Camera" which often outputs black in WebKit)
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

  const nonTripleBack = devices.find((c) => {
    const lbl = (c.label || '').toLowerCase();
    return (lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment')) && !lbl.includes('triple');
  });
  if (nonTripleBack) return nonTripleBack;

  const anyBack = devices.find((c) => {
    const lbl = (c.label || '').toLowerCase();
    return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment');
  });
  return anyBack || devices[0];
};

export default function CameraQRScanner({ onScanSuccess, mode = 'checkin', onClose }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);

  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scannedResult, setScannedResult] = useState('');
  const [fileScanning, setFileScanning] = useState(false);

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  const handleDecoded = (rawText) => {
    const cleanToken = extractCleanToken(rawText);
    if (!cleanToken) return;

    if (isMountedRef.current) setScannedResult(cleanToken);
    if (navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch {}
    }
    stopCamera();
    if (onScanSuccess) {
      onScanSuccess(cleanToken);
    }
  };

  const startDecodeLoop = () => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    let frameCounter = 0;
    scanTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      // Downscale slightly for fast mobile QR decoding while keeping sharp detail
      const maxEdge = 720;
      const scale = Math.min(1, maxEdge / Math.max(vw, vh));
      const w = Math.floor(vw * scale);
      const h = Math.floor(vh * scale);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      frameCounter += 1;
      const code = jsQR(imageData.data, w, h, {
        inversionAttempts: frameCounter % 3 === 0 ? 'attemptBoth' : 'dontInvert',
      });

      if (code && code.data) {
        handleDecoded(code.data);
      }
    }, 120);
  };

  const startCamera = async (deviceId = '', isFallback = false) => {
    if (isStartingRef.current || !isMountedRef.current) return;
    isStartingRef.current = true;
    setErrorMsg('');

    try {
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t('Browser ini tidak mendukung akses kamera langsung. Gunakan fitur "Foto QR".'));
      }

      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const activeTrack = stream.getVideoTracks()[0];
      const activeLabel = activeTrack?.label || '';
      const activeSettingsId = activeTrack?.getSettings?.()?.deviceId || '';

      // Attach stream directly to existing <video playsInline muted autoPlay>
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate available video cameras now that permission is granted
      let deviceList = [];
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        deviceList = allDevices
          .filter((d) => d.kind === 'videoinput')
          .map((d, idx) => ({
            id: d.deviceId,
            label: d.label || `Kamera ${idx + 1}`,
          }));
        if (isMountedRef.current && deviceList.length > 0) {
          setCameras(deviceList);
        }
      } catch {}

      // If iOS picked "Back Triple Camera" and a plain "Back Camera" exists, switch immediately
      if (!deviceId && !isFallback && /triple|dual|ultra/i.test(activeLabel) && deviceList.length > 1) {
        const bestCam = pickBestRearCamera(deviceList);
        if (bestCam && bestCam.id !== activeSettingsId && !/triple|dual|ultra/i.test(bestCam.label)) {
          setSelectedCameraId(bestCam.id);
          isStartingRef.current = false;
          return startCamera(bestCam.id, true);
        }
      }

      if (isMountedRef.current) {
        if (activeSettingsId) {
          setSelectedCameraId(activeSettingsId);
        } else if (deviceList.length > 0) {
          const bestCam = pickBestRearCamera(deviceList);
          if (bestCam) setSelectedCameraId(bestCam.id);
        }
        setIsScanning(true);
        startDecodeLoop();
      }
    } catch (err) {
      console.error('Camera startup error:', err);
      const errStr = String(err?.name || err?.message || err);

      if (!isFallback && deviceId) {
        isStartingRef.current = false;
        return startCamera('', true);
      }

      if (!isMountedRef.current) return;
      let msg = t('Gagal mengakses kamera.');
      if (err?.name === 'NotAllowedError' || errStr.includes('Permission')) {
        msg = t('Izin kamera ditolak. Harap izinkan akses kamera pada pengaturan browser Anda.');
      } else if (err?.name === 'NotFoundError' || errStr.includes('device not found')) {
        msg = t('Tidak ditemukan perangkat kamera pada perangkat ini.');
      } else if (err?.name === 'NotReadableError' || errStr.includes('NotReadableError') || errStr.includes('Could not start video source')) {
        msg = t('Kamera sedang digunakan aplikasi lain atau belum siap. Tekan "Coba Lagi" atau gunakan "Foto QR".');
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
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startCamera(newId, true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setFileScanning(true);

    try {
      const imgUrl = URL.createObjectURL(file);
      const img = new window.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = imgUrl;
      });

      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(imgUrl);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!code || !code.data) {
        throw new Error('QR tidak terdeteksi');
      }

      handleDecoded(code.data);
    } catch (err) {
      console.error('File scan error:', err);
      setErrorMsg(t('Tidak dapat mendeteksi kode QR dari gambar yang diunggah. Pastikan gambar jelas dan tidak buram.'));
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-2xl relative overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95">
      {/* Offscreen Canvas for QR Decoding */}
      <canvas ref={canvasRef} className="hidden" />

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
          onClick={() => {
            stopCamera();
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startCamera(selectedCameraId)}
                className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw size={12} />
                <span>{t('Coba Lagi')}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 whitespace-nowrap"
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
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover block"
        />

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
                {c.label}
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
            onClick={() => {
              stopCamera();
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
