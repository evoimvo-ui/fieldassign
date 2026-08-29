import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, organization } = useAuthStore();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGeneratedPasswordModal, setShowGeneratedPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'worker' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchWorkers = () => {
    setLoading(true);
    setError('');
    api.get('/users')
      .then(r => setWorkers(r.data))
      .catch(() => {
        setError(t('admin.loadError'));
        setWorkers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWorkers(); }, []);

  const handleToggle = async (id) => {
    try {
      await api.patch(`/users/${id}/toggle`);
      fetchWorkers();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/users', form);
      setGeneratedPassword(response.data.generatedPassword);
      setShowModal(false);
      setForm({ name: '', email: '', role: 'worker' });
      fetchWorkers();
      setShowGeneratedPasswordModal(true);
    } catch (err) {
      setError(err.response?.data?.message || t('admin.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (worker) => {
    setEditWorker({ id: worker._id, name: worker.name, email: worker.email, role: worker.role });
    setShowEditModal(true);
  };

  const handleUpdateWorker = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setError('');
    try {
      await api.patch(`/users/${editWorker.id}`, {
        name: editWorker.name, email: editWorker.email, role: editWorker.role,
      });
      setShowEditModal(false);
      fetchWorkers();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.editError'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (worker) => {
    if (!window.confirm(t('admin.resetPasswordConfirm', { name: worker.name }))) return;
    try {
      const { data } = await api.post(`/users/${worker._id}/reset-password`);
      setGeneratedPassword(data.generatedPassword);
      setShowGeneratedPasswordModal(true);
    } catch (err) {
      alert(err.response?.data?.message || t('admin.resetPasswordError'));
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh] px-4">
        <p className="text-sm text-gray-400 text-center">{t('admin.noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 break-words">{t('admin.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5 break-words">
            {workers.filter(w => w.active).length} {t('admin.active')} ·{' '}
            {t('admin.plan')}: <span className="font-medium capitalize">{organization?.plan || 'free'}</span> ·{' '}
            {t('admin.limit')}: {organization?.maxUsers} {t('admin.users')}
          </p>
        </div>
        <button className="btn btn-primary self-start sm:self-auto" onClick={() => setShowModal(true)}>
          {t('admin.addWorker')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4 break-words">{error}</div>
      )}

      {/* Workers list */}
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
      ) : workers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400 break-words">{t('admin.noWorkers')}</div>
      ) : (
        <div className="space-y-2">
          {workers.map(w => {
            const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={w._id} className="card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      w.active ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 break-words">{w.name}</div>
                      <div className="text-xs text-gray-400 break-words">{w.email} · <span className="capitalize">{w.role}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`badge ${w.active ? 'badge-completed' : 'badge-pending'}`}>
                      {w.active ? t('admin.statusActive') : t('admin.statusInactive')}
                    </span>
                    <button
                      onClick={() => openEditModal(w)}
                      className="btn text-xs min-h-[44px] min-w-[64px] px-3 py-2"
                    >
                      {t('admin.edit')}
                    </button>
                    <button
                      onClick={() => handleResetPassword(w)}
                      className="btn text-xs min-h-[44px] min-w-[64px] px-3 py-2"
                    >
                      {t('admin.resetPassword')}
                    </button>
                    {w._id !== user._id && (
                      <button
                        onClick={() => handleToggle(w._id)}
                        className={`btn text-xs min-h-[44px] px-3 py-2 ${w.active ? 'btn-danger' : ''}`}
                      >
                        {w.active ? t('admin.deactivate') : t('admin.activate')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan info */}
      <div className="card p-4 mt-6 bg-gray-50 border-dashed">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('admin.subscription')}</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium capitalize break-words">{organization?.plan || 'Free'}</div>
            <div className="text-xs text-gray-400 mt-0.5 break-words">
              {organization?.planStatus === 'active' ? t('admin.subscriptionActive') : organization?.planStatus || '—'}
            </div>
          </div>
          <button className="btn text-xs self-start sm:self-auto">{t('admin.manageSubscription')}</button>
        </div>
      </div>

      {/* Add worker modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-panel max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('admin.newWorker')}</h2>
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4 break-words">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">{t('admin.fullName')}</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('auth.namePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('admin.email')}</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder={t('admin.emailPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('admin.role')}</label>
                <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="worker">{t('admin.roleWorker')}</option>
                  <option value="admin">{t('admin.roleAdmin')}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? t('admin.adding') : t('admin.addBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit worker modal */}
      {showEditModal && editWorker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal-panel max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('admin.editWorker')}</h2>
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4 break-words">{error}</div>}
            <form onSubmit={handleUpdateWorker} className="space-y-4">
              <div>
                <label className="label">{t('admin.fullName')}</label>
                <input className="input" value={editWorker.name} onChange={e => setEditWorker({...editWorker, name: e.target.value})} placeholder={t('auth.namePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('admin.email')}</label>
                <input className="input" type="email" value={editWorker.email} onChange={e => setEditWorker({...editWorker, email: e.target.value})} placeholder={t('admin.emailPlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('admin.role')}</label>
                {editWorker.id === user._id ? (
                  <>
                    <select className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={editWorker.role} disabled>
                      <option value="admin">{t('admin.roleAdmin')}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{t('admin.cannotChangeOwnRole')}</p>
                  </>
                ) : (
                  <select className="input" value={editWorker.role} onChange={e => setEditWorker({...editWorker, role: e.target.value})}>
                    <option value="worker">{t('admin.roleWorker')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                  </select>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary">
                  {savingEdit ? t('admin.saving') : t('admin.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {showGeneratedPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowGeneratedPasswordModal(false)}>
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2 break-words">{t('admin.workerCreated')}</h2>
            <p className="text-gray-600 text-sm text-center mb-6 break-words">{t('admin.tempPassword')}</p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-6 break-all">
              <p className="text-2xl font-mono font-bold text-gray-900">{generatedPassword}</p>
            </div>
            <p className="text-gray-500 text-xs text-center mb-6 break-words">{t('admin.tempPasswordNote')}</p>
            <button className="btn btn-primary w-full justify-center" onClick={() => setShowGeneratedPasswordModal(false)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
