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

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">{t('admin.noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{t('admin.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {workers.filter(w => w.active).length} {t('admin.active')} ·{' '}
            {t('admin.plan')}: <span className="font-medium capitalize">{organization?.plan || 'free'}</span> ·{' '}
            {t('admin.limit')}: {organization?.maxUsers} {t('admin.users')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          {t('admin.addWorker')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>
      )}

      {/* Workers list */}
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
      ) : workers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">{t('admin.noWorkers')}</div>
      ) : (
        <div className="space-y-2">
          {workers.map(w => {
            const initials = w.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={w._id} className="card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  w.active ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{w.name}</div>
                  <div className="text-xs text-gray-400">{w.email} · <span className="capitalize">{w.role}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${w.active ? 'badge-completed' : 'badge-pending'}`}>
                    {w.active ? t('admin.statusActive') : t('admin.statusInactive')}
                  </span>
                  {w._id !== user._id && (
                    <button
                      onClick={() => handleToggle(w._id)}
                      className={`btn text-xs px-2.5 py-1.5 ${w.active ? 'btn-danger' : ''}`}
                    >
                      {w.active ? t('admin.deactivate') : t('admin.activate')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan info */}
      <div className="card p-4 mt-6 bg-gray-50 border-dashed">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('admin.subscription')}</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium capitalize">{organization?.plan || 'Free'}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {organization?.planStatus === 'active' ? t('admin.subscriptionActive') : organization?.planStatus || '—'}
            </div>
          </div>
          <button className="btn text-xs">{t('admin.manageSubscription')}</button>
        </div>
      </div>

      {/* Add worker modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('admin.newWorker')}</h2>
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-4">{error}</div>}
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
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? t('admin.adding') : t('admin.addBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {showGeneratedPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowGeneratedPasswordModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{t('admin.workerCreated')}</h2>
            <p className="text-gray-600 text-sm text-center mb-6">{t('admin.tempPassword')}</p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-6">
              <p className="text-2xl font-mono font-bold text-gray-900">{generatedPassword}</p>
            </div>
            <p className="text-gray-500 text-xs text-center mb-6">{t('admin.tempPasswordNote')}</p>
            <button className="btn btn-primary w-full justify-center" onClick={() => setShowGeneratedPasswordModal(false)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
