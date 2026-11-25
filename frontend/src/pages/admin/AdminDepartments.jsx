import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useModal } from '../../context/ModalContext';
import { Building2, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function AdminDepartments() {
  const { showConfirm, showAlert } = useModal();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setCode('');
    setName('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditId(d.id);
    setCode(d.code);
    setName(d.name);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, { code, name });
      } else {
        await api.post('/departments', { code, name });
      }
      setModalOpen(false);
      fetchDepts();
    } catch (err) {
      const apiErr = err.response?.data;
      if (apiErr?.errors && apiErr.errors.length > 0) {
        setError(apiErr.errors.map((e) => e.message).join(', '));
      } else {
        setError(apiErr?.message || 'Gagal menyimpan departemen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm({
      title: 'Hapus Departemen',
      message: `Apakah Anda yakin ingin menghapus departemen ${name}? Pastikan tidak ada akun pengguna atau data ruangan yang sedang terhubung ke departemen ini.`,
      type: 'danger',
      confirmText: 'Hapus Departemen',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/departments/${id}`);
      fetchDepts();
      showAlert({
        title: 'Berhasil',
        message: `Departemen ${name} berhasil dihapus.`,
        type: 'success',
      });
    } catch (err) {
      showAlert({
        title: 'Gagal Menghapus',
        message: err.response?.data?.message || 'Gagal menghapus departemen.',
        type: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="text-brand-500" size={24} />
            <span>Master Departemen Perusahaan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daftar unit organisasi dan departemen operasional Plant Batam.
          </p>
        </div>

        <button onClick={openCreate} className="btn btn-primary text-xs sm:text-sm self-start sm:self-auto flex items-center gap-1.5">
          <Plus size={16} />
          <span>Tambah Departemen</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat departemen...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded">
                    {d.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {d._count?.users || 0} Pengguna
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">{d.name}</h3>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => openEdit(d)} className="btn btn-ghost text-xs py-1 px-2.5 min-h-0">
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button onClick={() => handleDelete(d.id, d.name)} className="btn btn-ghost text-rose-500 text-xs py-1 px-2.5 min-h-0">
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {editId ? 'Edit Departemen' : 'Tambah Departemen'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Kode Departemen</label>
                <input
                  type="text"
                  required
                  className="input font-mono uppercase text-xs"
                  placeholder="Input kode departemen"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="label">Nama Lengkap Departemen</label>
                <input
                  type="text"
                  required
                  className="input text-xs"
                  placeholder="Input nama departemen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary text-xs">
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
