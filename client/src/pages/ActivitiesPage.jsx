import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import api from '../services/api.js';

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/activities', { params: { date } })
      .then(r => setActivities(r.data))
      .catch(() => {
        setError(t('activities.loadingError'));
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [date, t]);

  const locale = localStorage.getItem('fo_lang') === 'en' ? 'en-GB' : 'bs-BA';

  const getActivityText = (a) => {
    const map = {
      accepted: t('activities.statusAccepted'),
      inprogress: t('activities.statusInProgress'),
      completed: t('activities.statusCompleted'),
      rejected: t('activities.statusRejected'),
    };
    return map[a.type] || a.text || '';
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
        <h1 className="text-base font-semibold text-gray-900 break-words">{t('activities.title')}</h1>
        <input
          type="date"
          className="input text-sm sm:w-auto w-full"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4 break-words">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-12">{t('common.loading')}</div>
      ) : activities.length === 0 ? (
        <div className="card p-8 sm:p-10 text-center text-sm text-gray-400 break-words">
          {t('activities.noActivities')}
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {activities.map((a, i) => (
            <div key={a._id || i} className="flex items-start gap-3 p-3 sm:p-4">
              <div className="text-xs text-gray-400 w-12 flex-shrink-0 mt-0.5">
                {new Date(a.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 break-words">{getActivityText(a)}</div>
                {a.task?.title && <div className="text-xs text-gray-400 mt-0.5 break-words">{a.task.title}</div>}
                {a.note && <div className="text-xs text-gray-500 mt-0.5 break-words">{a.note}</div>}
                {a.gps?.lat && <div className="text-xs text-brand-600 mt-0.5 break-words">📍 {t('activities.gpsRecorded')}</div>}
                {a.evidence?.length > 0 && (
                  <div className="text-xs text-brand-600 mt-0.5 break-words">📎 {a.evidence.length} {t('activities.evidence')}</div>
                )}
                {a.user?.name && <div className="text-xs text-gray-400 mt-1 break-words">{a.user.name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-right">
        {activities.length} {t('activities.total')}
      </div>
    </div>
  );
}
