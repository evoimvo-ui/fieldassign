import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore.js';
import api from '../services/api.js';

const WEEKDAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const lang = localStorage.getItem('fo_lang') || 'bs';
  return date.toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getRecurrenceSummary(template, t) {
  const type = template.recurrence?.type;
  if (type === 'daily') return t('templates.summaryDaily');
  if (type === 'weekly') {
    const days = (template.recurrence?.weekdays || [])
      .sort((a, b) => a - b)
      .map((d) => t(`templates.${WEEKDAY_KEYS[d]}`))
      .join(', ');
    return `${t('templates.summaryWeekly')}: ${days}`;
  }
  if (type === 'monthly') {
    return `${t('templates.summaryMonthly')} ${template.recurrence?.dayOfMonth}`;
  }
  return '';
}

function getPeriodSummary(template, t) {
  const from = formatDate(template.startDate);
  if (template.endDate) {
    return t('templates.periodFromTo', { from, to: formatDate(template.endDate) });
  }
  return t('templates.periodOpenEnded', { from });
}

const emptyForm = () => ({
  title: '',
  description: '',
  location: '',
  assignedTo: '',
  priority: 'medium',
  timeStart: '',
  timeEnd: '',
  recurrence: { type: 'daily', weekdays: [1, 2, 3, 4, 5], dayOfMonth: 1 },
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
});

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [workers, setWorkers] = useState([]);
  const [workersError, setWorkersError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    setLoadError('');
    api.get('/templates')
      .then((r) => setTemplates(r.data))
      .catch(() => setLoadError(t('templates.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
    if (user?.role === 'admin') {
      setWorkersError('');
      api.get('/users')
        .then((r) => setWorkers(r.data))
        .catch(() => setWorkersError(t('tasks.loadingWorkers')));
    }
  }, [user?.role, t]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (tmpl) => {
    setEditingId(tmpl._id);
    const weekdays = tmpl.recurrence?.weekdays && tmpl.recurrence.weekdays.length > 0
      ? [...tmpl.recurrence.weekdays]
      : [1, 2, 3, 4, 5];
    setForm({
      title: tmpl.title || '',
      description: tmpl.description || '',
      location: tmpl.location || '',
      assignedTo: tmpl.assignedTo?._id || tmpl.assignedTo || '',
      priority: tmpl.priority || 'medium',
      timeStart: tmpl.timeStart || '',
      timeEnd: tmpl.timeEnd || '',
      recurrence: {
        type: tmpl.recurrence?.type || 'daily',
        weekdays,
        dayOfMonth: tmpl.recurrence?.dayOfMonth || 1,
      },
      startDate: tmpl.startDate ? new Date(tmpl.startDate).toISOString().split('T')[0] : '',
      endDate: tmpl.endDate ? new Date(tmpl.endDate).toISOString().split('T')[0] : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const toggleWeekday = (d) => {
    const current = form.recurrence.weekdays || [];
    const next = current.includes(d)
      ? current.filter((x) => x !== d)
      : [...current, d];
    setForm({ ...form, recurrence: { ...form.recurrence, weekdays: next } });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = { ...form };
    if (!payload.endDate) payload.endDate = null;

    try {
      if (editingId) {
        await api.put(`/templates/${editingId}`, payload);
      } else {
        await api.post('/templates', payload);
      }
      setShowModal(false);
      setEditingId(null);
      fetchTemplates();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          (editingId ? t('templates.saveError') : t('templates.createError'))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(t('templates.deleteConfirm'))) return;
    try {
      await api.delete(`/templates/${tmpl._id}`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const handleTogglePause = async (tmpl) => {
    try {
      await api.patch(`/templates/${tmpl._id}/toggle-pause`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const isWeekly = form.recurrence.type === 'weekly';
  const isMonthly = form.recurrence.type === 'monthly';

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
          <h1 className="text-base font-semibold text-gray-900 break-words">{t('templates.title')}</h1>
          {user?.role === 'admin' && (
            <button className="btn btn-primary self-start sm:self-auto" onClick={openCreate}>
              {t('templates.newTemplate')}
            </button>
          )}
        </div>

        {loadError && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{loadError}</div>
        )}
        {workersError && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{workersError}</div>
        )}

        {loading && <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>}

        {!loading && templates.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400">{t('templates.noTemplates')}</div>
        )}

        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl._id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">🔁</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-gray-900 truncate">{tmpl.title}</div>
                      <span className={`badge ${tmpl.status === 'active' ? 'badge-active' : 'badge-paused'}`}>
                        {tmpl.status === 'active' ? t('templates.statusActive') : t('templates.statusPaused')}
                      </span>
                      <span className={`badge badge-${tmpl.priority}`}>
                        {t(`priority.${tmpl.priority}`)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      {tmpl.location && <span>📍 {tmpl.location}</span>}
                      {tmpl.timeStart && (
                        <span>🕐 {tmpl.timeStart}{tmpl.timeEnd ? ` – ${tmpl.timeEnd}` : ''}</span>
                      )}
                      {tmpl.assignedTo?.name && <span>👤 {tmpl.assignedTo.name}</span>}
                    </div>

                    <div className="mt-2 text-xs text-gray-600">
                      <span className="font-medium">{t('templates.type')}:</span>{' '}
                      {getRecurrenceSummary(tmpl, t)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">{t('templates.period')}:</span>{' '}
                      {getPeriodSummary(tmpl, t)}
                    </div>
                    {tmpl.description && (
                      <p className="mt-2 text-xs text-gray-500 leading-relaxed">{tmpl.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {user?.role === 'admin' && (
                    <>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleTogglePause(tmpl)}
                      >
                        {tmpl.status === 'active' ? t('templates.pause') : t('templates.activate')}
                      </button>
                      <button className="btn btn-sm" onClick={() => openEdit(tmpl)}>
                        {t('common.edit')}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tmpl)}>
                        {t('templates.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-base font-semibold text-gray-900 mb-5">
                {editingId ? t('templates.editTemplate') : t('templates.newTemplate')}
              </h2>

              {formError && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{formError}</div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">{t('templates.taskName')}</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('templates.priority')}</label>
                    <select
                      className="input"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="high">{t('priority.high')}</option>
                      <option value="medium">{t('priority.medium')}</option>
                      <option value="low">{t('priority.low')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('templates.assignTo')}</label>
                    <select
                      className="input"
                      value={form.assignedTo}
                      onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                      required
                    >
                      <option value="">{t('tasks.assignPlaceholder')}</option>
                      {workers.map((w) => (
                        <option key={w._id} value={w._id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{t('templates.location')}</label>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('templates.timeStart')}</label>
                    <input
                      className="input"
                      type="time"
                      value={form.timeStart}
                      onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{t('templates.timeEnd')}</label>
                    <input
                      className="input"
                      type="time"
                      value={form.timeEnd}
                      onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{t('templates.description')}</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="label">{t('templates.type')}</label>
                  <div className="flex gap-3 flex-wrap">
                    {['daily', 'weekly', 'monthly'].map((type) => (
                      <label key={type} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceType"
                          value={type}
                          checked={form.recurrence.type === type}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              recurrence: { ...form.recurrence, type: e.target.value },
                            })
                          }
                        />
                        {t(`templates.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                      </label>
                    ))}
                  </div>
                </div>

                {isWeekly && (
                  <div>
                    <label className="label">{t('templates.weekdays')}</label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                        const selected = (form.recurrence.weekdays || []).includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleWeekday(d)}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 sm:py-1.5 rounded-lg text-xs border transition-colors ${
                              selected
                                ? 'bg-brand-400 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {t(`templates.${WEEKDAY_KEYS[d]}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isMonthly && (
                  <div>
                    <label className="label">{t('templates.dayOfMonth')}</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={31}
                      value={form.recurrence.dayOfMonth}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          recurrence: { ...form.recurrence, dayOfMonth: parseInt(e.target.value, 10) || 1 },
                        })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">{t('templates.dayOfMonthHint')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t('templates.startDate')}</label>
                    <input
                      className="input"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t('templates.endDate')}</label>
                    <input
                      className="input"
                      type="date"
                      value={form.endDate}
                      placeholder={t('templates.endDatePlaceholder')}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <button type="button" className="btn" onClick={closeModal}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('templates.saving') : t('templates.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
