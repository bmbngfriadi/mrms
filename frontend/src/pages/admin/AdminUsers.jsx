import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Users,
  Plus,
  Edit2,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckSquare,
  Square,
  Sliders,
  Shield,
  KeyRound,
  Check,
} from 'lucide-react';
import { PERMISSION_GROUPS, ROLE_DEFAULTS, ALL_PERMISSION_IDS } from '../../utils/permissions';

export default function AdminUsers() {
  const { t } = useI18n();
  const { showConfirm, showAlert } = useModal();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nik, setNik] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [cleanOldData, setCleanOldData] = useState(true);
  const fileInputRef = useRef(null);

  // Permissions Checklist Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permUser, setPermUser] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [permSearch, setPermSearch] = useState('');
  const [permTab, setPermTab] = useState('ALL');
  const [savingPerms, setSavingPerms] = useState(false);

  const openPermModal = (user) => {
    setPermUser(user);
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      setSelectedPerms(user.permissions);
    } else {
      setSelectedPerms(ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.EMPLOYEE);
    }
    setPermSearch('');
    setPermTab('ALL');
    setPermModalOpen(true);
  };

  const togglePerm = (permId) => {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleGroup = (groupId) => {
    const group = PERMISSION_GROUPS.find((g) => g.groupId === groupId);
    if (!group) return;
    const groupIds = group.permissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedPerms.includes(id));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const applyPreset = (presetKey) => {
    if (presetKey === 'ALL') {
      setSelectedPerms(ALL_PERMISSION_IDS);
    } else if (presetKey === 'CLEAR') {
      setSelectedPerms([]);
    } else if (ROLE_DEFAULTS[presetKey]) {
      setSelectedPerms(ROLE_DEFAULTS[presetKey]);
    }
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    try {
      await api.put(`/users/${permUser.id}/permissions`, {
        permissions: selectedPerms,
      });
      showAlert({
        title: 'Checklist Akses Disimpan',
        message: `Hak akses untuk ${permUser.name} (${selectedPerms.length} izin) berhasil diperbarui.`,
        type: 'success',
      });
      setPermModalOpen(false);
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Gagal Menyimpan Hak Akses',
        message: err.response?.data?.message || 'Gagal menyimpan checklist hak akses.',
        type: 'danger',
      });
    } finally {
      setSavingPerms(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/users?limit=100'),
        api.get('/departments'),
      ]);
      setUsers(uRes.data.data || []);
      setDepartments(dRes.data.data || []);
      if (!departmentId && dRes.data.data?.length > 0) {
        setDepartmentId(dRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setNik('');
    setUsername('');
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('EMPLOYEE');
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditId(u.id);
    setNik(u.nik);
    setUsername(u.username || '');
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setPassword('');
    setRole(u.role);
    setDepartmentId(u.department?.id || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const cleanUsername = username.trim().toLowerCase() || null;
      if (editId) {
        const payload = {
          nik,
          username: cleanUsername,
          name,
          email,
          phone,
          role,
          departmentId,
        };
        if (password) payload.password = password;
        await api.put(`/users/${editId}`, payload);
      } else {
        await api.post('/users', {
          nik,
          username: cleanUsername,
          name,
          email,
          phone,
          password: password || 'Password123!',
          role,
          departmentId,
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || t('Gagal menyimpan data pengguna.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'menonaktifkan' : 'mengaktifkan';
    const confirmed = await showConfirm({
      title: `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} Pengguna`,
      message: `Apakah Anda yakin ingin ${action} akun ${user.name}?`,
      type: user.isActive ? 'warning' : 'info',
      confirmText: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
    });
    if (!confirmed) return;

    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
      showAlert({
        title: 'Status Diperbarui',
        message: `Akun ${user.name} berhasil ${user.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Mengubah Status',
        message: err.response?.data?.message || t('Gagal mengubah status pengguna.'),
        type: 'danger',
      });
    }
  };

  const handleDeleteUser = async (user) => {
    if (currentUser?.id === user.id) {
      showAlert({
        title: 'Aksi Ditolak',
        message: 'Anda tidak dapat menghapus akun Anda sendiri.',
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun ${user.name} (NIK: ${user.nik})? Data yang sudah dihapus tidak dapat dipulihkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus Pengguna',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/users/${user.id}`);
      showAlert({
        title: 'Pengguna Dihapus',
        message: `Akun ${user.name} berhasil dihapus dari sistem.`,
        type: 'success',
      });
      if (modalOpen && editId === user.id) {
        setModalOpen(false);
      }
      fetchUsers();
    } catch (err) {
      showAlert({
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || t('Gagal menghapus akun pengguna.'),
        type: 'danger',
      });
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await api.get('/users/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_Pengguna_MRMS.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showAlert({
        title: 'Gagal Unduh Template',
        message: err.response?.data?.message || 'Gagal mengunduh file template Excel.',
        type: 'danger',
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError('');
      setImportResult(null);
    }
  };

  const handleStartImport = async () => {
    if (!importFile) {
      setImportError('Harap pilih file template Excel (.xlsx) atau CSV terlebih dahulu.');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Konfirmasi Bulk Import Pengguna',
      message: cleanOldData
        ? `Anda akan mengimpor file "${importFile.name}" dengan mode Sinkronisasi Master AKTIF.\n\nData pengguna lama yang ada di file akan ditimpa, dan akun non-admin yang tidak ada di file akan DIHAPUS/DINONAKTIFKAN. Lanjutkan?`
        : `Anda akan mengimpor file "${importFile.name}". Data pengguna yang cocok akan diperbarui dan data baru akan ditambahkan. Lanjutkan?`,
      type: cleanOldData ? 'danger' : 'warning',
      confirmText: 'Ya, Mulai Import',
      cancelText: 'Batal',
    });
    if (!confirmed) return;

    setImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await api.post('/users/import', {
            fileBase64: base64Data,
            cleanUnmatched: cleanOldData,
          });

          setImportResult(res.data.data);
          fetchUsers();
        } catch (apiErr) {
          setImportError(apiErr.response?.data?.message || 'Gagal mengimpor data pengguna.');
        } finally {
          setImporting(false);
        }
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file dari perangkat Anda.');
        setImporting(false);
      };
      reader.readAsDataURL(importFile);
    } catch (err) {
      setImportError(err.message || 'Gagal memproses file import.');
      setImporting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.nik.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.name && u.department.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Page Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-1">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            {t('Kelola Pengguna')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            {t('Kelola akun karyawan, username login, hak akses (RBAC), departemen, dan integrasi WhatsApp.')}
          </p>
        </div>

        {/* Action Buttons Toolbar: Desktop Single Horizontal Row / Mobile Ergonomic Stack */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {/* Secondary Utilities: Download Template & Bulk Import */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 order-2 sm:order-1">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="btn btn-secondary flex-1 sm:flex-initial text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap px-3.5 py-2 font-bold cursor-pointer transition min-w-0"
              title="Download Template Format Excel (.xlsx)"
            >
              {downloadingTemplate ? (
                <Loader2 size={15} className="animate-spin text-brand-600 shrink-0" />
              ) : (
                <Download size={15} className="text-slate-500 shrink-0" />
              )}
              <span className="truncate">{downloadingTemplate ? 'Mengunduh...' : 'Download Template'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setImportError('');
                setShowSkippedDetails(false);
                setImportModalOpen(true);
              }}
              className="btn bg-slate-800 hover:bg-slate-900 text-white flex-1 sm:flex-initial text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap px-3.5 py-2 font-bold cursor-pointer transition min-w-0"
              title="Bulk Import Pengguna dari File Excel / CSV"
            >
              <Upload size={15} className="shrink-0" />
              <span className="truncate">Bulk Import</span>
            </button>
          </div>

          {/* Primary Action: Tambah Pengguna */}
          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap px-4 py-2 font-bold order-1 sm:order-2 w-full sm:w-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('Tambah Pengguna')}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar - Placeholder-Free */}
      <div className="relative w-full sm:max-w-sm flex items-center">
        <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="input text-xs"
          style={{ paddingLeft: '2.5rem' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content: High-Density Table on Desktop / Responsive Card List on Mobile */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('Memuat data...')}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs sm:text-sm">
          {search ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada data pengguna.'}
        </div>
      ) : (
        <>
          {/* 1. DESKTOP VIEW (md:block) - High-Density Data Table */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="th">{t('Karyawan')}</th>
                  <th className="th">{t('Username')}</th>
                  <th className="th">{t('Departemen')}</th>
                  <th className="th">{t('Kontak')}</th>
                  <th className="th">{t('Peran')}</th>
                  <th className="th">{t('Status')}</th>
                  <th className="th text-right">{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td">
                      <div className="font-bold text-slate-800 dark:text-white text-xs">{u.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 font-bold">{u.nik}</div>
                    </td>
                    <td className="td">
                      {u.username ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          <AtSign size={11} className="text-slate-400" />
                          <span>{u.username}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="td">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {u.department?.name || '-'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="text-xs text-slate-600 dark:text-slate-300">{u.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.phone}</div>
                    </td>
                    <td className="td">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : u.role === 'HRGA'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                        {u.permissions && u.permissions.length > 0 ? (
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-900/40">
                            {u.permissions.length} Hak Akses
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Default Role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {u.isActive ? t('Aktif') : t('Nonaktif')}
                      </button>
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPermModal(u)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 text-brand-600 dark:text-brand-400 transition cursor-pointer"
                          title="Checklist Hak Akses & Menu"
                        >
                          <ShieldCheck size={16} />
                        </button>

                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-500 transition cursor-pointer"
                          title={t('Ubah')}
                        >
                          <Edit2 size={14} />
                        </button>

                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. MOBILE VIEW (block md:hidden) - Ergonomic Native Industrial Card List */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-xs"
              >
                {/* Header: Name, NIK, Role Badge & Status Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {u.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 font-bold mt-0.5">
                      {u.nik}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {u.permissions && u.permissions.length > 0 && (
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-900/40">
                        {u.permissions.length} Akses
                      </span>
                    )}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : u.role === 'HRGA'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer active:scale-95 ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {u.isActive ? t('Aktif') : t('Nonaktif')}
                    </button>
                  </div>
                </div>

                {/* Body Details: Username, Department, Contact */}
                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Username
                    </span>
                    {u.username ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                        <AtSign size={11} className="text-slate-400" />
                        <span>{u.username}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs mt-0.5 block">-</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                      Departemen
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] truncate block mt-0.5">
                      {u.department?.name || '-'}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Kontak Karyawan
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate">
                      {u.email}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{u.phone}</div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => openPermModal(u)}
                    className="btn bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-900/40 text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>Checklist Akses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(u)}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>{t('Ubah')}</span>
                  </button>

                  {currentUser?.id !== u.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="btn btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL BULK IMPORT PENGGUNA (EXCEL / CSV)                       */}
      {/* ============================================================== */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  Bulk Import Data Pengguna
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2.5 mb-4 text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-white">
                    Sistem Overwrite Master Pengguna:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <li>
                      Gunakan format file Excel (<strong>.xlsx</strong>) atau <strong>.csv</strong>.
                    </li>
                    <li>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        Menimpa Data Lama:
                      </span>{' '}
                      Semua data dari file import akan <strong>langsung menimpa dan memperbarui</strong> data pengguna yang sudah ada di sistem.
                    </li>
                    <li>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Tambah Data Baru:
                      </span>{' '}
                      Data baru yang belum ada di sistem akan otomatis ditambahkan.
                    </li>
                    <li>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        Proteksi Akun ADMIN:
                      </span>{' '}
                      Akun dengan peran <strong>ADMIN</strong> dilindungi penuh dan <strong>tidak akan pernah tertimpa atau terhapus</strong>.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cleanOldData}
                    onChange={(e) => setCleanOldData(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    Sinkronisasi Master: Hapus data karyawan lama di sistem yang tidak ada di file import
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 text-[11px] cursor-pointer shrink-0"
                >
                  <Download size={13} />
                  <span>Download Template</span>
                </button>
              </div>
            </div>

            {/* File Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30 group"
            >
              <FileSpreadsheet
                size={34}
                className="mx-auto text-slate-400 group-hover:text-brand-500 transition mb-2"
              />
              {importFile ? (
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    {importFile.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(importFile.size / 1024).toFixed(1)} KB &bull; Klik untuk ganti file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Klik untuk Pilih File Excel / CSV
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mendukung file berekstensi .xlsx atau .csv
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {importError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Import Result Feedback */}
            {importResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                  <span>Proses Bulk Import Selesai</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Total Baris
                    </div>
                    <div className="text-lg font-black text-slate-800 dark:text-white">
                      {importResult.totalRows}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 shadow-xs">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Ditimpa (Update)
                    </div>
                    <div className="text-lg font-black text-blue-700 dark:text-blue-300">
                      {importResult.overwrittenCount || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Ditambahkan Baru
                    </div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      +{importResult.importedCount || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 shadow-xs">
                    <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                      ADMIN Dilindungi
                    </div>
                    <div className="text-lg font-black text-purple-700 dark:text-purple-300">
                      {importResult.skippedCount || 0}
                    </div>
                  </div>
                </div>

                {importResult.cleanedCount > 0 && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <span>Data lama di sistem dibersihkan:</span>
                    <span className="font-bold">{importResult.cleanedCount} akun lama dihapus</span>
                  </div>
                )}

                {/* Overwritten and Imported details */}
                {((importResult.overwritten && importResult.overwritten.length > 0) ||
                  (importResult.imported && importResult.imported.length > 0) ||
                  (importResult.skipped && importResult.skipped.length > 0)) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>
                        {showSkippedDetails ? 'Sembunyikan' : 'Lihat'} rincian per baris
                      </span>
                      {showSkippedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showSkippedDetails && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-1.5 text-[11px]">
                        {importResult.overwritten?.map((item, idx) => (
                          <div
                            key={'ovr-' + idx}
                            className="p-1.5 rounded bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2"
                          >
                            <div className="truncate font-semibold text-slate-700 dark:text-slate-200">
                              Baris {item.row}: {item.name} ({item.nik})
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0 font-bold">
                              Ditimpa ({item.department || item.role})
                            </div>
                          </div>
                        ))}
                        {importResult.imported?.map((item, idx) => (
                          <div
                            key={'imp-' + idx}
                            className="p-1.5 rounded bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2"
                          >
                            <div className="truncate font-semibold text-slate-700 dark:text-slate-200">
                              Baris {item.row}: {item.name} ({item.nik})
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
                              Baru (+{item.department || item.role})
                            </div>
                          </div>
                        ))}
                        {importResult.skipped?.map((s, idx) => (
                          <div
                            key={'skp-' + idx}
                            className="p-1.5 rounded bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-2"
                          >
                            <div className="truncate font-semibold text-slate-700 dark:text-slate-200">
                              Baris {s.row}: {s.name || s.nik}
                            </div>
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 shrink-0 font-bold">
                              {s.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="btn btn-ghost text-xs py-2 px-3.5"
              >
                {importResult ? 'Tutup' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!importFile || importing}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memproses Import...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>{importResult ? 'Import File Lain' : 'Mulai Import Data'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TAMBAH / UBAH PENGGUNA                                   */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {editId ? t('Ubah') + ' ' + t('Pengguna') : t('Tambah Pengguna Baru')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label">{t('NIK Karyawan')}</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Input NIK karyawan"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('Peran (RBAC)')}</label>
                  <select
                    className="input text-xs font-bold"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="EMPLOYEE">{t('Karyawan')} (EMPLOYEE)</option>
                    <option value="HRGA">HRGA</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label">{t('Nama Lengkap')}</label>
                  <input
                    type="text"
                    required
                    className="input text-xs"
                    placeholder="Input nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t('Username Login')}</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="Input username akun"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">{t('Email Perusahaan')}</label>
                <input
                  type="email"
                  required
                  className="input text-xs"
                  placeholder="Input email perusahaan"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Nomor WhatsApp')}</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  placeholder="Input nomor WhatsApp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{t('Departemen')}</label>
                <select
                  className="input text-xs"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {editId ? t('Password Baru (Kosongkan bila tidak diubah)') : t('Password Awal')}
                </label>
                <input
                  type="password"
                  className="input text-xs"
                  placeholder="Input kata sandi akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                {editId && currentUser?.id !== editId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const targetUser = users.find((x) => x.id === editId);
                      if (targetUser) handleDeleteUser(targetUser);
                    }}
                    className="btn btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Hapus Pengguna</span>
                  </button>
                ) : (
                  <div></div>
                )}

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
                    disabled={submitting}
                    className="btn btn-primary text-xs py-2 px-4"
                  >
                    {submitting ? t('Menyimpan...') : t('Simpan')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECKLIST HAK AKSES MODAL (Granular RBAC Administrator)   */}
      {/* ========================================================= */}
      {permModalOpen && permUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-white truncate">
                      Atur Checklist Hak Akses & Modul
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-500 text-white">
                      {permUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Pengguna: <strong className="text-slate-700 dark:text-slate-300">{permUser.name}</strong> ({permUser.nik} &bull; {permUser.department?.name || 'Plant Batam'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPermModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Preset Toolbar */}
            <div className="px-5 py-2.5 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Preset Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset('ADMIN')}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-200 font-bold transition cursor-pointer"
                >
                  Full Admin (Semua)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('HRGA')}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-200 font-bold transition cursor-pointer"
                >
                  Default HRGA
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('EMPLOYEE')}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
                >
                  Default Karyawan
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('CLEAR')}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold transition cursor-pointer"
                >
                  Kosongkan
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                  {selectedPerms.length} dari {ALL_PERMISSION_IDS.length} Izin Aktif
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'ALL', label: 'Semua Kategori' },
                  { id: 'navigation', label: 'Navigasi & Menu' },
                  { id: 'booking_actions', label: 'Izin Booking' },
                  { id: 'history_actions', label: 'Izin Riwayat' },
                  { id: 'system_admin', label: 'Kontrol Admin' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPermTab(tab.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      permTab === tab.id
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari izin hak akses..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="input text-xs pl-8 py-1.5 w-full"
                />
              </div>
            </div>

            {/* Permissions List Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {PERMISSION_GROUPS.filter(
                (g) => permTab === 'ALL' || g.groupId === permTab
              ).map((group) => {
                const filteredItems = group.permissions.filter(
                  (p) =>
                    !permSearch ||
                    p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                    p.desc.toLowerCase().includes(permSearch.toLowerCase()) ||
                    p.id.toLowerCase().includes(permSearch.toLowerCase())
                );

                if (filteredItems.length === 0) return null;

                const groupIds = group.permissions.map((p) => p.id);
                const allSelected = groupIds.every((id) => selectedPerms.includes(id));

                return (
                  <div
                    key={group.groupId}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    {/* Group Header */}
                    <div className="px-4 py-3 bg-white dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          <span>{group.groupName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {filteredItems.length} item
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{group.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleGroup(group.groupId)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          allSelected
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200'
                        }`}
                      >
                        {allSelected ? 'Batal Semua' : 'Pilih Semua'}
                      </button>
                    </div>

                    {/* Group Items Grid */}
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {filteredItems.map((perm) => {
                        const isChecked = selectedPerms.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePerm(perm.id)}
                            className={`p-3 rounded-xl border transition cursor-pointer select-none flex items-start gap-3 ${
                              isChecked
                                ? 'bg-white dark:bg-slate-800 border-brand-500/60 shadow-xs ring-1 ring-brand-500/30'
                                : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-80'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                                  isChecked
                                    ? 'bg-brand-500 text-white'
                                    : 'border-2 border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-bold leading-snug ${
                                    isChecked
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {perm.name}
                                </span>
                                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 shrink-0">
                                  {perm.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                {perm.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="text-xs text-slate-500 hidden sm:block">
                Perubahan checklist langsung diterapkan saat pengguna refresh halaman atau membuka menu.
              </div>
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPermModalOpen(false)}
                  className="btn btn-ghost text-xs py-2 px-3.5"
                >
                  {t('Batal')}
                </button>
                <button
                  type="button"
                  disabled={savingPerms}
                  onClick={handleSavePerms}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <ShieldCheck size={15} />
                  <span>{savingPerms ? 'Menyimpan...' : 'Simpan Hak Akses'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
