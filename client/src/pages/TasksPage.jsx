import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useTaskStore from '../store/taskStore.js';
import useAuthStore from '../store/authStore.js';
import api from '../services/api.js';

export default function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { tasks, selectedTask, activities, loading, fetchTasks, fetchTask, updateStatus, addActivity } = useTaskStore();

  const [showModal, setShowModal] = useState(false);
  const [activityText, setActivityText] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', location: '', assignedTo: '', priority: 'medium', timeStart: '', timeEnd: '' });
  const [workers, setWorkers] = useState([]);
  const [workersError, setWorkersError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getActivityText = (a) => {
    const map = {
      accepted: t('activities.statusAccepted'),
      inprogress: t('activities.statusInProgress'),
      completed: t('activities.statusCompleted'),
      rejected: t('activities.statusRejected'),
    };
    return map[a.type] || a.text || '';
  };

  useEffect(() => {
    fetchTasks();
    if (user?.role === 'admin') {
      setWorkersError('');
      api.get('/users')
        .then(r => setWorkers(r.data))
        .catch(() => setWorkersError(t('tasks.loadingWorkers')));
    }
  }, [fetchTasks, user?.role, t]);

  const handleSelectTask = (task) => fetchTask(task._id);

  const handleStatusChange = async (status) => {
    if (!selectedTask) return;
    let gps = null;
    if (navigator.geolocation) {
      gps = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
    }
    await updateStatus(selectedTask._id, status, gps);
  };

  const handleAddActivity = async () => {
    if (!activityText.trim() || !selectedTask) return;
    await addActivity(selectedTask._id, activityText.trim());
    setActivityText('');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', newTask);
      setShowModal(false);
      setNewTask({ title: '', description: '', location: '', assignedTo: '', priority: 'medium', timeStart: '', timeEnd: '' });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const statusKeys = ['all', 'pending', 'accepted', 'inprogress', 'completed'];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Task list */}
      <div className="flex-1 overflow-y-auto p-6 border-r border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-gray-900">{t('tasks.title')}</h1>
          {user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              {t('tasks.newTask')}
            </button>
          )}
        </div>

        {workersError && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{workersError}</div>
        )}

        {/* Filters */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {statusKeys.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-brand-400 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? t('tasks.filterAll') : t(`status.${s}`)}
            </button>
          ))}
        </div>

        {loading && <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>}

        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task._id}
              onClick={() => handleSelectTask(task)}
              className={`card p-4 cursor-pointer transition-all hover:border-gray-200 ${
                selectedTask?._id === task._id ? 'border-brand-400 ring-1 ring-brand-400/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-brand-400' }[task.priority]
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {task.location && <span>📍 {task.location}</span>}
                      {task.timeStart && <span>🕐 {task.timeStart}{task.timeEnd ? ` – ${task.timeEnd}` : ''}</span>}
                    </div>
                    {task.assignedTo && (
                      <div className="text-xs text-gray-400 mt-0.5">→ {task.assignedTo.name}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge badge-${task.status}`}>{t(`status.${task.status}`)}</span>
                  <span className={`badge badge-${task.priority}`}>{t(`priority.${task.priority}`)}</span>
                </div>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="card p-8 text-center text-sm text-gray-400">{t('tasks.noTasks')}</div>
          )}
        </div>
      </div>

      {/* Right: Task detail */}
      <div className="w-80 overflow-y-auto flex flex-col bg-white">
        {selectedTask ? (
          <>
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">{selectedTask.title}</h2>
              <div className="flex gap-1.5 flex-wrap">
                <span className={`badge badge-${selectedTask.status}`}>{t(`status.${selectedTask.status}`)}</span>
                <span className={`badge badge-${selectedTask.priority}`}>{t(`priority.${selectedTask.priority}`)}</span>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100 space-y-2 text-sm">
              {selectedTask.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">📍</span> {selectedTask.location}
                </div>
              )}
              {selectedTask.timeStart && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">🕐</span> {selectedTask.timeStart}{selectedTask.timeEnd ? ` – ${selectedTask.timeEnd}` : ''}
                </div>
              )}
              {selectedTask.description && (
                <p className="text-gray-500 text-xs leading-relaxed mt-2">{selectedTask.description}</p>
              )}
            </div>

            <div className="p-4 border-b border-gray-100 space-y-2">
              {selectedTask.status === 'pending' && (
                <>
                  <button className="btn btn-primary w-full justify-center" onClick={() => handleStatusChange('accepted')}>
                    {t('tasks.accept')}
                  </button>
                  <button className="btn btn-danger w-full justify-center" onClick={() => handleStatusChange('rejected')}>
                    {t('tasks.reject')}
                  </button>
                </>
              )}
              {selectedTask.status === 'accepted' && (
                <button className="btn btn-primary w-full justify-center" onClick={() => handleStatusChange('inprogress')}>
                  {t('tasks.start')}
                </button>
              )}
              {selectedTask.status === 'inprogress' && (
                <button className="btn btn-primary w-full justify-center" onClick={() => handleStatusChange('completed')}>
                  {t('tasks.finish')}
                </button>
              )}
            </div>

            <div className="p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('tasks.activities')}</h3>
                <span className="text-xs text-gray-400">{activities.length}</span>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-400">{t('tasks.noActivities')}</p>
              ) : (
                <div className="space-y-0">
                  {activities.map((a, i) => (
                    <div key={a._id || i} className="flex gap-2.5 pb-3">
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1 flex-shrink-0" />
                        {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(a.timestamp).toLocaleTimeString(i18nLocale(), { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs text-gray-700">{getActivityText(a)}</span>
                        </div>
                        {a.note && <div className="text-xs text-gray-400 mt-0.5">{a.note}</div>}
                        {a.gps?.lat && <div className="text-xs text-brand-600 mt-0.5">📍 {t('tasks.gpsRecorded')}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTask.status === 'inprogress' && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    className="input text-xs flex-1"
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    placeholder={t('tasks.addActivity')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                  />
                  <button className="btn btn-primary px-3" onClick={handleAddActivity}>+</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">{t('tasks.selectTask')}</p>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('tasks.newTask')}</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">{t('tasks.taskName')}</label>
                <input className="input" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder={t('tasks.taskNamePlaceholder')} required />
              </div>
              <div>
                <label className="label">{t('tasks.location')}</label>
                <input className="input" value={newTask.location} onChange={e => setNewTask({...newTask, location: e.target.value})} placeholder={t('tasks.locationPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('tasks.priority')}</label>
                  <select className="input" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                    <option value="high">{t('priority.high')}</option>
                    <option value="medium">{t('priority.medium')}</option>
                    <option value="low">{t('priority.low')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('tasks.assignTo')}</label>
                  <select className="input" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} required>
                    <option value="">{t('tasks.assignPlaceholder')}</option>
                    {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('tasks.timeStart')}</label>
                  <input className="input" type="time" value={newTask.timeStart} onChange={e => setNewTask({...newTask, timeStart: e.target.value})} />
                </div>
                <div>
                  <label className="label">{t('tasks.timeEnd')}</label>
                  <input className="input" type="time" value={newTask.timeEnd} onChange={e => setNewTask({...newTask, timeEnd: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">{t('tasks.description')}</label>
                <textarea className="input" rows={3} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder={t('tasks.descriptionPlaceholder')} />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('tasks.createTask')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function i18nLocale() {
  const lang = localStorage.getItem('fo_lang') || 'bs';
  return lang === 'bs' ? 'bs-BA' : 'en-GB';
}
