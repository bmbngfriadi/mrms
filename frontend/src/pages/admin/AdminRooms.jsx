import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import api from '../../services/api';
import RoomPhotoCarousel from '../../components/RoomPhotoCarousel';
import {
  DoorOpen,
  Plus,
  Edit2,
  MapPin,
  Users,
  X,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  FileImage,
  Loader2,
} from 'lucide-react';

// Client-side helper to read and optimize image files to high-res, lightweight Web-friendly JPEG data URLs
const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar yang valid.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600; // 1600px max width/height for crisp display

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to web-optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses file gambar.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
};

export default function AdminRooms() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [photos, setPhotos] = useState([]);
  const [facilitiesStr, setFacilitiesStr] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File Upload State
  const fileInputRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rooms');
      setRooms(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setCode('');
    setName('');
    setLocation('');
    setCapacity(10);
    setDescription('');
    setImageUrl('');
    setPhotos([]);
    setFacilitiesStr('Smart TV 65 Inch, Whiteboard, Video Conference System');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setCode(r.code);
    setName(r.name);
    setLocation(r.location);
    setCapacity(r.capacity);
    setDescription(r.description || '');
    setImageUrl(r.imageUrl || '');
    setPhotos(
      Array.isArray(r.photos) && r.photos.length > 0
        ? r.photos
        : [r.imageUrl].filter(Boolean)
    );
    setFacilitiesStr(r.facilities?.map((f) => f.name).join(', ') || '');
    setError('');
    setModalOpen(true);
  };

  // Add Files handler
  const handleFilesAdded = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploadingFiles(true);
    setError('');

    try {
      const processedDataUrls = [];
      for (const file of files) {
        const dataUrl = await processImageFile(file);
        processedDataUrls.push(dataUrl);
      }

      setPhotos((prev) => {
        const updated = [...prev, ...processedDataUrls];
        if (!imageUrl && updated.length > 0) {
          setImageUrl(updated[0]);
        }
        return updated;
      });
    } catch (err) {
      setError(err.message || 'Gagal memproses file foto yang dipilih.');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    handleFilesAdded(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(updated);
    if (updated.length > 0) {
      setImageUrl(updated[0]);
    } else {
      setImageUrl('');
    }
  };

  const handleDeleteRoom = async (r) => {
    const confirmed = await showConfirm({
      title: t('Hapus Ruangan'),
      message: `${t('Apakah Anda yakin ingin menghapus ruangan')} "${r.name}" (${r.code})? ${t('Tindakan ini permanen dan tidak dapat dibatalkan.')}`,
      confirmText: t('Ya, Hapus Ruangan'),
      cancelText: t('Batal'),
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.delete(`/rooms/${r.id}`);
      fetchRooms();
      if (modalOpen && editId === r.id) {
        setModalOpen(false);
      }
      showAlert({
        title: t('Berhasil Dihapus'),
        message: `${t('Ruangan')} "${r.name}" ${t('berhasil dihapus dari sistem.')}`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: t('Gagal Menghapus Ruangan'),
        message: err.response?.data?.message || t('Gagal menghapus ruangan.'),
        type: 'danger',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const facilitiesArray = facilitiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1, condition: 'GOOD' }));

    try {
      const finalPhotos = photos.length > 0 ? photos : [imageUrl].filter(Boolean);
      const payload = {
        code,
        name,
        location,
        capacity: parseInt(capacity, 10),
        description: description || null,
        imageUrl: finalPhotos[0] || imageUrl || null,
        photos: finalPhotos,
        facilities: facilitiesArray,
      };

      if (editId) {
        await api.put(`/rooms/${editId}`, payload);
      } else {
        await api.post('/rooms', payload);
      }

      setModalOpen(false);
      fetchRooms();
      showAlert({
        title: 'Berhasil',
        message: `Ruangan ${name} berhasil disimpan beserta foto yang diupload.`,
        type: 'success',
      });
    } catch (err) {
      setError(err.response?.data?.message || t('Gagal menyimpan ruangan.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t('Master Ruang Meeting')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('Kelola daftar ruangan, kapasitas, lokasi pabrik, upload file foto, dan fasilitas operasional.')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>{t('Tambah Ruangan')}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('Memuat ruangan...')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((r) => (
            <div
              key={r.id}
              className="card overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Auto-Slide Photo Carousel Header */}
                <div className="relative w-full overflow-hidden">
                  <RoomPhotoCarousel
                    photos={r.photos}
                    imageUrl={r.imageUrl}
                    alt={r.name}
                    aspectRatio="aspect-[16/10]"
                  />

                  <div className="absolute top-3 left-3 z-20">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[11px] font-mono font-black text-white border border-white/20 shadow-sm">
                      {r.code}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                    {r.name}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span>{r.location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-slate-400 shrink-0" />
                      <span>{r.capacity} {t('Orang')}</span>
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
                      {r.description}
                    </p>
                  )}

                  {/* Facilities Pill List */}
                  {r.facilities && r.facilities.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {r.facilities.slice(0, 4).map((f) => (
                        <span
                          key={f.id}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                        >
                          {f.name}
                        </span>
                      ))}
                      {r.facilities.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium">
                          +{r.facilities.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="flex-1 btn btn-ghost text-xs py-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>{t('Ubah')} {t('Ruangan & Foto')}</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteRoom(r)}
                    className="btn btn-ghost text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900 rounded-xl transition"
                    title={t('Hapus Ruangan')}
                  >
                    <Trash2 size={13} />
                    <span>{t('Hapus')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Ubah Ruangan dengan Upload File Foto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {editId ? t('Ubah Ruangan & Foto') : t('Tambah Ruangan Baru')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* PHOTO UPLOAD & CAROUSEL MANAGER SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-brand-500" />
                    <span>Daftar Foto Ruangan (Slide Otomatis di Sisi Karyawan)</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {photos.length} Foto Aktif
                  </span>
                </div>

                {/* Live Preview Carousel inside Modal */}
                {photos.length > 0 && (
                  <div className="rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700">
                    <RoomPhotoCarousel
                      photos={photos}
                      alt={name || 'Pratinjau'}
                      aspectRatio="aspect-[21/9]"
                    />
                  </div>
                )}

                {/* Thumbnails Strip */}
                {photos.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-12 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 shrink-0 group shadow-xs"
                      >
                        <img src={p} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Hapus foto ini"
                        >
                          <Trash2 size={13} className="text-rose-400" />
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-0 inset-x-0 bg-brand-500 text-white text-[8px] font-bold text-center py-0.2">
                            Utama
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Native File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* FILE UPLOAD DROPZONE & ADD FILE BUTTON (NO LINKS) */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 scale-[0.99]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-brand-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {uploadingFiles ? (
                    <div className="py-2 flex flex-col items-center justify-center gap-2 text-brand-600">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="text-xs font-bold">Memproses file foto...</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-1">
                      <UploadCloud size={26} className="mx-auto text-brand-500" />
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Klik untuk Tambah File Foto atau Tarik & Lepas (Drag & Drop)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Pilih foto dari komputer Anda (dapat memilih beberapa file sekaligus)
                      </div>
                      <div className="pt-2">
                        <span className="btn btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 pointer-events-none shadow-xs">
                          <Plus size={14} />
                          <span>Pilih File Foto</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Code & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kode Ruangan</label>
                  <input
                    type="text"
                    required
                    className="input font-mono uppercase text-xs"
                    placeholder="Input kode ruangan"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="label">Kapasitas Maksimal (Orang)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-xs font-bold"
                    placeholder="Input kapasitas ruangan"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Nama Lengkap Ruangan</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  placeholder="Input nama ruangan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Location */}
              <div>
                <label className="label">Lokasi Gedung / Lantai</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  placeholder="Input lokasi ruangan"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Facilities */}
              <div>
                <label className="label">Perlengkapan & Fasilitas Ruangan (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="Input perlengkapan ruangan"
                  value={facilitiesStr}
                  onChange={(e) => setFacilitiesStr(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Deskripsi & Peruntukan Ruangan</label>
                <textarea
                  rows="3"
                  className="input text-xs resize-none py-2"
                  placeholder="Input deskripsi ruangan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  {editId && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetRoom = rooms.find((x) => x.id === editId);
                        if (targetRoom) handleDeleteRoom(targetRoom);
                      }}
                      className="btn btn-ghost text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>{t('Hapus Ruangan')}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-ghost text-xs py-2 px-3.5"
                  >
                    {t('Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingFiles}
                    className="btn btn-primary text-xs py-2 px-4 font-bold"
                  >
                    {submitting ? t('Menyimpan...') : t('Simpan Ruangan')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
