import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import useTaskStore from '../store/taskStore.js';
import { format } from 'date-fns';
import { bs } from 'date-fns/locale';

const STATUS_LABELS = {
  pending: 'Na čekanju', accepted: 'Prihvaćen',
  inprogress: 'U toku', completed: 'Završen', rejected: 'Odbijen',
};
const PRIORITY_COLORS = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-brand-400' };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks({ date: format(new Date(), 'yyyy-MM-dd') });
  }, [fetchTasks]);

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inprogress = tasks.filter(t => t.status === 'inprogress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Dobro jutro';
    if (h < 18) return 'Dobar dan';
    return 'Dobro veče';
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {greet()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">
          {format(new Date(), 'EEEE, d. MMMM yyyy.', { locale: bs })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ukupno danas', value: tasks.length, color: 'text-gray-900' },
          { label: 'Završenih', value: completed, color: 'text-brand-600' },
          { label: 'U toku', value: inprogress, color: 'text-amber-600' },
          { label: 'Na čekanju', value: pending, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tasks list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Zadaci za danas</h2>
        <button onClick={() => navigate('/tasks')} className="text-xs text-brand-600 hover:text-brand-800">
          Svi zadaci →
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Učitavanje...</div>
      ) : tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-gray-400 text-sm">Nema zadataka za danas</div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task._id}
              onClick={() => navigate('/tasks')}
              className="card p-4 hover:border-gray-200 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {task.location && <span>📍 {task.location}</span>}
                      {task.timeStart && <span>🕐 {task.timeStart}{task.timeEnd ? ` - ${task.timeEnd}` : ''}</span>}
                    </div>
                  </div>
                </div>
                <span className={`badge badge-${task.status} flex-shrink-0`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
