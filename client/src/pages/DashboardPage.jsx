import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import useTaskStore from '../store/taskStore.js';
import { format } from 'date-fns';
import { bs, enUS } from 'date-fns/locale';

const PRIORITY_COLORS = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-brand-400' };

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const navigate = useNavigate();

  const [workerStats, setWorkerStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('month'); // 'week' | 'month' | 'all'

  const dateLocale = i18n.language === 'bs' ? bs : enUS;

  useEffect(() => {
    fetchTasks({ date: format(new Date(), 'yyyy-MM-dd') });
  }, [fetchTasks]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setStatsLoading(true);
    api.get('/reports/worker-stats', { params: { period: statsPeriod } })
      .then(r => setWorkerStats(r.data))
      .catch(() => setWorkerStats([]))
      .finally(() => setStatsLoading(false));
  }, [statsPeriod, user?.role]);

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inprogress = tasks.filter(t => t.status === 'inprogress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greeting_morning');
    if (h < 18) return t('dashboard.greeting_day');
    return t('dashboard.greeting_evening');
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">
          {greet()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize break-words">
          {format(new Date(), 'EEEE, d. MMMM yyyy.', { locale: dateLocale })}
        </p>
      </div>

      {/* Stats — 1 kol na mob, 2 na sm mob/tablet, 4 na md+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5 sm:mb-6">
        {[
          { label: t('dashboard.totalToday'), value: tasks.length, color: 'text-gray-900' },
          { label: t('dashboard.completed'), value: completed, color: 'text-brand-600' },
          { label: t('dashboard.inProgress'), value: inprogress, color: 'text-amber-600' },
          { label: t('dashboard.pending'), value: pending, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="card p-3 sm:p-4 min-h-[80px]">
            <div className="text-xs text-gray-400 mb-1 break-words">{s.label}</div>
            <div className={`text-2xl sm:text-3xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tasks list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 break-words">{t('dashboard.todayTasks')}</h2>
        <button
          onClick={() => navigate('/tasks')}
          className="text-xs text-brand-600 hover:text-brand-800 min-h-[36px] flex items-center justify-center"
        >
          {t('dashboard.allTasks')}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="card p-6 sm:p-8 text-center">
          <div className="text-gray-400 text-sm break-words">{t('dashboard.noTasks')}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task._id}
              onClick={() => navigate('/tasks')}
              className="card p-3 sm:p-4 hover:border-gray-200 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 break-words">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                      {task.location && <span className="break-words">📍 {task.location}</span>}
                      {task.timeStart && <span>🕐 {task.timeStart}{task.timeEnd ? ` - ${task.timeEnd}` : ''}</span>}
                    </div>
                  </div>
                </div>
                <span className={`badge badge-${task.status} flex-shrink-0`}>
                  {t(`status.${task.status}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.workerStats')}</h2>
            <div className="flex flex-wrap gap-1.5">
              {['week', 'month', 'all'].map((p) => (
                <button
                  key={p}
                  onClick={() => setStatsPeriod(p)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-[32px] ${
                    statsPeriod === p
                      ? 'bg-brand-400 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t(`dashboard.period${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {statsLoading ? (
            <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
          ) : workerStats.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">{t('dashboard.noStats')}</div>
          ) : (
            <div className="space-y-2">
              {workerStats.map((w) => {
                const initials = w.workerName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                return (
                  <div key={w.workerId} className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600 flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{w.workerName}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {w.completed} {t('dashboard.tasksCompleted')} · {w.rejected} {t('dashboard.tasksRejected')}
                          {w.avgDurationMinutes != null && (
                            <> · {Math.round(w.avgDurationMinutes)} min {t('dashboard.avgDuration')}</>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-brand-600 flex-shrink-0">
                        {Math.round(w.completionRate)}%
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(w.completionRate))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
