import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import { format } from 'date-fns';

export default function ClientsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', contactPerson: '', phone: '', email: '', notes: '' });
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = () => {
    setLoading(true);
    setError('');
    api.get('/clients')
      .then(r => setClients(r.data))
      .catch(() => {
        setError(t('common.error'));
        setClients([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/clients', form);
      setShowModal(false);
      setForm({ name: '', location: '', contactPerson: '', phone: '', email: '', notes: '' });
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/clients/${editForm._id}`, editForm);
      setShowEditModal(false);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/clients/${id}/toggle`);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const openHistory = async (client) => {
    setSelectedClient(client);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/clients/${client._id}/tasks`);
      setHistory(data);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh] px-4">
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center">{t('admin.noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{t('clients.title')}</h1>
        <button className="btn btn-primary self-start sm:self-auto" onClick={() => setShowModal(true)}>
          + {t('clients.newClient')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4 break-words">{error}</div>
      )}

      {/* Clients list */}
      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.loading')}</div>
      ) : clients.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400 dark:text-gray-500 break-words">{t('clients.noClients')}</div>
      ) : (
        <div className="space-y-2">
          {clients.map(c => (
            <div key={c._id} className="card p-3 sm:p-4 cursor-pointer hover:border-brand-200 transition-colors" onClick={() => openHistory(c)}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{c.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 break-words">
                    {c.location || '—'} · {c.contactPerson || '—'} · {c.phone || '—'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end" onClick={e => e.stopPropagation()}>
                  <span className={`badge ${c.active ? 'badge-completed' : 'badge-pending'}`}>
                    {c.active ? t('clients.active') : t('clients.inactive')}
                  </span>
                  <button
                    onClick={() => { setEditForm(c); setShowEditModal(true); }}
                    className="btn text-xs min-h-[44px] px-3 py-2"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleToggle(c._id)}
                    className={`btn text-xs min-h-[44px] px-3 py-2 ${c.active ? 'btn-danger' : ''}`}
                  >
                    {c.active ? t('clients.deactivate') : t('clients.activate')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-panel max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">{t('clients.newClient')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">{t('clients.name')}</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('clients.namePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('clients.location')}</label>
                <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Adresa..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('clients.contactPerson')}</label>
                  <input className="input" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
                </div>
                <div>
                  <label className="label">{t('clients.phone')}</label>
                  <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">{t('clients.email')}</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="label">{t('clients.notes')}</label>
                <textarea className="input min-h-[80px]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? t('clients.saving') : t('clients.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal-panel max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">{t('clients.editClient')}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="label">{t('clients.name')}</label>
                <input className="input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
              </div>
              <div>
                <label className="label">{t('clients.location')}</label>
                <input className="input" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('clients.contactPerson')}</label>
                  <input className="input" value={editForm.contactPerson} onChange={e => setEditForm({...editForm, contactPerson: e.target.value})} />
                </div>
                <div>
                  <label className="label">{t('clients.phone')}</label>
                  <input className="input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">{t('clients.email')}</label>
                <input className="input" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div>
                <label className="label">{t('clients.notes')}</label>
                <textarea className="input min-h-[80px]" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? t('clients.saving') : t('clients.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4" onClick={e => e.target === e.currentTarget && setShowHistoryModal(false)}>
          <div className="modal-panel max-w-md w-full max-h-[90vh] flex flex-col">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('clients.taskHistory')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{selectedClient.name}</p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {historyLoading ? (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.loading')}</div>
              ) : history.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('clients.noTaskHistory')}</div>
              ) : (
                history.map(task => (
                  <div key={task._id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(task.scheduledDate), 'dd.MM.yyyy.')}</span>
                      <span className={`badge badge-${task.status} text-[10px]`}>{t(`status.${task.status}`)}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{task.assignedTo?.name}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn w-full sm:w-auto justify-center" onClick={() => setShowHistoryModal(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
