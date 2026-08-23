import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import api from '../services/api.js';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/daily', { params: { date } })
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [date]);

  const loadReport = async (task) => {
    setSelected(task);
    setReportLoading(true);
    try {
      const { data } = await api.get(`/reports/task/${task._id}`);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: task list */}
      <div className="w-72 border-r border-gray-100 overflow-y-auto p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold text-gray-900">{t('reports.title')}</h1>
          <input
            type="date"
            className="input w-auto text-xs py-1 px-2"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-xs text-gray-400 text-center py-8">{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8">{t('reports.noTasks')}</div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task._id}
                onClick={() => loadReport(task)}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                  selected?._id === task._id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className="font-medium text-gray-800 text-xs">{task.title}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{task.location}</span>
                  <span className={`badge badge-${task.status} text-xs`}>
                    {t(`status.${task.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: report detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">{t('reports.selectTask')}</p>
          </div>
        ) : reportLoading ? (
          <div className="text-sm text-gray-400 text-center py-12">{t('reports.generating')}</div>
        ) : report ? (
          <div className="max-w-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{report.task.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(report.task.scheduledDate), 'dd.MM.yyyy.')}
                  {report.task.timeStart && ` · ${report.task.timeStart}${report.task.timeEnd ? ` – ${report.task.timeEnd}` : ''}`}
                </p>
              </div>
              <button className="btn text-xs" onClick={() => window.print()}>🖨 {t('common.print')}</button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card p-3">
                <div className="text-xs text-gray-400 mb-1">{t('reports.worker')}</div>
                <div className="text-sm font-medium">{report.assignedTo?.name}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 mb-1">{t('reports.location')}</div>
                <div className="text-sm font-medium">{report.task.location || '—'}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 mb-1">{t('reports.totalActivities')}</div>
                <div className="text-sm font-medium">{report.summary.totalActivities}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 mb-1">{t('reports.duration')}</div>
                <div className="text-sm font-medium">{report.summary.duration || '—'}</div>
              </div>
            </div>

            {/* GPS checkpoints */}
            {(report.gpsCheckpoints.accepted || report.gpsCheckpoints.arrival || report.gpsCheckpoints.completed) && (
              <div className="card p-4 mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('reports.gpsCheckpoints')}</div>
                <div className="space-y-2">
                  {report.gpsCheckpoints.accepted && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="badge badge-accepted">{t('reports.accepted')}</span>
                      <span className="text-gray-500">
                        {new Date(report.gpsCheckpoints.accepted.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        · {report.gpsCheckpoints.accepted.lat?.toFixed(5)}, {report.gpsCheckpoints.accepted.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                  {report.gpsCheckpoints.arrival && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="badge badge-inprogress">{t('reports.arrival')}</span>
                      <span className="text-gray-500">
                        {new Date(report.gpsCheckpoints.arrival.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        · {report.gpsCheckpoints.arrival.lat?.toFixed(5)}, {report.gpsCheckpoints.arrival.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                  {report.gpsCheckpoints.completed && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="badge badge-completed">{t('reports.finished')}</span>
                      <span className="text-gray-500">
                        {new Date(report.gpsCheckpoints.completed.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        · {report.gpsCheckpoints.completed.lat?.toFixed(5)}, {report.gpsCheckpoints.completed.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activities timeline */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{t('reports.activityTimeline')}</div>
              {report.activities.length === 0 ? (
                <p className="text-xs text-gray-400">{t('reports.noActivities')}</p>
              ) : (
                <div>
                  {report.activities.map((a, i) => (
                    <div key={i} className="flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 mt-0.5" />
                        {i < report.activities.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-gray-400 w-10">{a.time}</span>
                          <span className="text-sm text-gray-800">{a.text}</span>
                        </div>
                        {a.note && <div className="text-xs text-gray-500 mt-0.5 ml-12">{a.note}</div>}
                        {a.gps?.lat && <div className="text-xs text-brand-600 mt-0.5 ml-12">📍 {t('reports.gps')}: {a.gps.lat?.toFixed(5)}, {a.gps.lng?.toFixed(5)}</div>}
                        {a.evidence?.length > 0 && <div className="text-xs text-brand-600 mt-0.5 ml-12">📎 {a.evidence.length} {t('reports.evidence')}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-400 text-right">
              {t('reports.generated')}: {format(new Date(report.generatedAt), 'dd.MM.yyyy. HH:mm')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center py-12">{t('reports.loadError')}</div>
        )}
      </div>
    </div>
  );
}
