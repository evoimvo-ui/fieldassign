import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useTaskStore from '../store/taskStore.js';
import useAuthStore from '../store/authStore.js';
import api from '../services/api.js';

export default function TasksPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { tasks, selectedTask, activities, loading, fetchTasks, fetchTask, updateStatus, addActivity, setSelectedTask } = useTaskStore();

  const [showModal, setShowModal] = useState(false);
  const [activityText, setActivityText] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', location: '', assignedTo: '', priority: 'medium', timeStart: '', timeEnd: '', client: null });
  const [workers, setWorkers] = useState([]);
  const [clients, setClients] = useState([]);
  const [workersError, setWorkersError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTask, setEditTask] = useState({ title: '', description: '', location: '', assignedTo: '', priority: 'medium', timeStart: '', timeEnd: '', client: null });
  const [savingEdit, setSavingEdit] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

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
      
      api.get('/clients')
        .then(r => setClients(r.data.filter(c => c.active)))
        .catch(() => {});
    }
  }, [fetchTasks, user?.role, t]);

  const handleSelectTask = (task) => fetchTask(task._id);
  const handleBackToList = () => {
    if (setSelectedTask) setSelectedTask(null);
  };

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
      setNewTask({ title: '', description: '', location: '', assignedTo: '', priority: 'medium', timeStart: '', timeEnd: '', client: null });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    }
  };

  const openEditModal = (task) => {
    setEditTask({
      title: task.title,
      description: task.description || '',
      location: task.location || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      priority: task.priority,
      timeStart: task.timeStart || '',
      timeEnd: task.timeEnd || '',
      client: task.client?._id || task.client || null,
    });
    setShowEditModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/tasks/${selectedTask._id}`, editTask);
      setShowEditModal(false);
      await fetchTasks();
      await fetchTask(selectedTask._id);
    } catch (err) {
      alert(err.response?.data?.message || t('common.error'));
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = tasks
    .filter(task => statusFilter === 'all' || task.status === statusFilter)
    .filter(task => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        task.title?.toLowerCase().includes(q) ||
        task.location?.toLowerCase().includes(q) ||
        task.assignedTo?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === 'time') {
        if (!a.timeStart) return 1;
        if (!b.timeStart) return -1;
        return a.timeStart.localeCompare(b.timeStart);
      }
      return 0;
    });
  const statusKeys = ['all', 'pending', 'accepted', 'inprogress', 'completed'];

  const TaskDetailPanel = () => (
    <div className="h-full overflow-y-auto flex flex-col bg-white md:border-l md:border-gray-100">
      {selectedTask ? (
        <>
          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex items-start gap-2">
            <button
              onClick={handleBackToList}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-50 -ml-2"
              aria-label="Back"
            >
              ←
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 mb-2 break-words">{selectedTask.title}</h2>
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className={`badge badge-${selectedTask.status}`}>{t(`status.${selectedTask.status}`)}</span>
                <span className={`badge badge-${selectedTask.priority}`}>{t(`priority.${selectedTask.priority}`)}</span>
                {user?.role === 'admin' && (
                  <button
                    className="btn text-xs min-h-[36px] min-w-[36px]"
                    onClick={() => openEditModal(selectedTask)}
                  >
                    ✏️ {t('tasks.edit')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 space-y-2 text-sm">
            {selectedTask.client && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400">🏢</span>
                <span className="font-medium break-words">{selectedTask.client.name}</span>
              </div>
            )}
            {selectedTask.location && (
              <div className="flex items-start gap-2 text-gray-600">
                <span className="text-gray-400 mt-0.5">📍</span>
                <span className="break-words">{selectedTask.location}</span>
              </div>
            )}
            {selectedTask.timeStart && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-400">🕐</span>
                <span>{selectedTask.timeStart}{selectedTask.timeEnd ? ` – ${selectedTask.timeEnd}` : ''}</span>
              </div>
            )}
            {selectedTask.description && (
              <p className="text-gray-500 text-xs leading-relaxed break-words">{selectedTask.description}</p>
            )}
          </div>

          <div className="px-3 sm:px-4 py-3 border-b border-gray-100 space-y-2">
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

          <div className="px-3 sm:px-4 py-3 flex-1">
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
                    <div className="flex-1 pb-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(a.timestamp).toLocaleTimeString(i18nLocale(), { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-gray-700 break-words">{getActivityText(a)}</span>
                      </div>
                      {a.note && <div className="text-xs text-gray-400 mt-0.5 break-words">{a.note}</div>}
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
                  className="input text-xs flex-1 min-h-[44px]"
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
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <p className="text-sm text-gray-400 text-center">{t('tasks.selectTask')}</p>
        </div>
      )}
    </div>
  );

  const TaskListPanel = () => (
    <div className="h-full overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 md:border-r md:border-gray-100 flex-1">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-base font-semibold text-gray-900">{t('tasks.title')}</h1>
        {user?.role === 'admin' && (
          <button className="btn btn-primary flex-shrink-0" onClick={() => setShowModal(true)}>
            <span className="sm:inline">{t('tasks.newTask')}</span>
          </button>
        )}
      </div>

      {workersError && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4 break-words">{workersError}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          className="input flex-1"
          placeholder={t('tasks.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="input sm:w-48"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="default">{t('tasks.sortDefault')}</option>
          <option value="priority">{t('tasks.sortPriority')}</option>
          <option value="time">{t('tasks.sortTime')}</option>
        </select>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {statusKeys.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-2 rounded-full border transition-colors min-h-[36px] ${
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
            className={`card p-3 sm:p-4 cursor-pointer transition-all hover:border-gray-200 ${
              selectedTask?._id === task._id ? 'border-brand-400 ring-1 ring-brand-400/20' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-brand-400' }[task.priority]
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 break-words">{task.title}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                    {task.location && <span className="break-words">📍 {task.location}</span>}
                    {task.timeStart && <span>🕐 {task.timeStart}{task.timeEnd ? ` – ${task.timeEnd}` : ''}</span>}
                  </div>
                  {task.assignedTo && (
                    <div className="text-xs text-gray-400 mt-0.5 break-words">→ {task.assignedTo.name}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`badge badge-${task.status}`}>{t(`status.${task.status}`)}</span>
                <span className={`badge badge-${task.priority}`}>{t(`priority.${task.priority}`)}</span>
                {task.sourceTemplate && <span className="badge badge-template">{t('tasks.fromTemplate')}</span>}
              </div>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400 break-words">
            {searchQuery.trim()
              ? t('tasks.noSearchResults', { query: searchQuery })
              : t('tasks.noTasks')}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full md:flex md:overflow-hidden flex flex-col md:flex-row">
      <div className="md:hidden flex-1 overflow-hidden">
        {selectedTask ? <TaskDetailPanel /> : <TaskListPanel />}
      </div>

      <div className="hidden md:flex md:h-full md:w-full">
        <TaskListPanel />
        <div className="md:w-80 lg:w-96 flex-shrink-0 xl:max-w-[28rem]">
          <TaskDetailPanel />
        </div>
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal-panel max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('tasks.newTask')}</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">{t('tasks.taskName')}</label>
                <input
                  className="input"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder={t('tasks.taskNamePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="label">{t('tasks.selectClient')}</label>
                <select
                  className="input"
                  value={newTask.client || ''}
                  onChange={(e) => {
                    const clientId = e.target.value;
                    const selected = clients.find(c => c._id === clientId);
                    setNewTask({
                      ...newTask,
                      client: clientId || null,
                      location: selected ? selected.location : newTask.location,
                    });
                  }}
                >
                  <option value="">{t('tasks.manualEntry')}</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('tasks.location')}</label>
                <input
                  className="input"
                  value={newTask.location}
                  onChange={e => setNewTask({...newTask, location: e.target.value})}
                  placeholder={t('tasks.locationPlaceholder')}
                />
              </div>
              <div className="form-grid-2">
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
              <div className="form-grid-2">
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
                <textarea className="input min-h-[88px]" rows={3} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder={t('tasks.descriptionPlaceholder')} />
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('tasks.createTask')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && !savingEdit && setShowEditModal(false)}
        >
          <div className="modal-panel max-w-md">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('tasks.editTask')}</h2>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="label">{t('tasks.taskName')}</label>
                <input
                  className="input"
                  value={editTask.title}
                  onChange={e => setEditTask({...editTask, title: e.target.value})}
                  placeholder={t('tasks.taskNamePlaceholder')}
                  required
                  disabled={savingEdit}
                />
              </div>
              <div>
                <label className="label">{t('tasks.selectClient')}</label>
                <select
                  className="input"
                  value={editTask.client || ''}
                  onChange={(e) => {
                    const clientId = e.target.value;
                    const selected = clients.find(c => c._id === clientId);
                    setEditTask({
                      ...editTask,
                      client: clientId || null,
                      location: selected ? selected.location : editTask.location,
                    });
                  }}
                  disabled={savingEdit}
                >
                  <option value="">{t('tasks.manualEntry')}</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('tasks.location')}</label>
                <input
                  className="input"
                  value={editTask.location}
                  onChange={e => setEditTask({...editTask, location: e.target.value})}
                  placeholder={t('tasks.locationPlaceholder')}
                  disabled={savingEdit}
                />
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="label">{t('tasks.priority')}</label>
                  <select className="input" value={editTask.priority} onChange={e => setEditTask({...editTask, priority: e.target.value})} disabled={savingEdit}>
                    <option value="high">{t('priority.high')}</option>
                    <option value="medium">{t('priority.medium')}</option>
                    <option value="low">{t('priority.low')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('tasks.assignTo')}</label>
                  <select className="input" value={editTask.assignedTo} onChange={e => setEditTask({...editTask, assignedTo: e.target.value})} required disabled={savingEdit}>
                    <option value="">{t('tasks.assignPlaceholder')}</option>
                    {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-grid-2">
                <div>
                  <label className="label">{t('tasks.timeStart')}</label>
                  <input className="input" type="time" value={editTask.timeStart} onChange={e => setEditTask({...editTask, timeStart: e.target.value})} disabled={savingEdit} />
                </div>
                <div>
                  <label className="label">{t('tasks.timeEnd')}</label>
                  <input className="input" type="time" value={editTask.timeEnd} onChange={e => setEditTask({...editTask, timeEnd: e.target.value})} disabled={savingEdit} />
                </div>
              </div>
              <div>
                <label className="label">{t('tasks.description')}</label>
                <textarea className="input min-h-[88px]" rows={3} value={editTask.description} onChange={e => setEditTask({...editTask, description: e.target.value})} placeholder={t('tasks.descriptionPlaceholder')} disabled={savingEdit} />
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)} disabled={savingEdit}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? t('tasks.saving') : t('tasks.saveChanges')}
                </button>
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
