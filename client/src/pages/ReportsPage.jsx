import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import { generateReportPdf, sendReportByEmail } from '../utils/generateReportPdf.js';
import SignaturePad from '../components/SignaturePad.jsx';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { organization } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [workerSignature, setWorkerSignature] = useState(null);
  const [clientSignature, setClientSignature] = useState(null);
  const fileInputRef = useRef(null);

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

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
    setPhotos([]);
    setPhotoPreviews([]);
    setWorkerSignature(null);
    setClientSignature(null);
    setSendStatus(null);
    try {
      const { data } = await api.get(`/reports/task/${task._id}`);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelected(null);
    setReport(null);
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPhotoPreviews(prev => [...prev, url]);
    });
    e.target.value = '';
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadPdf = async () => {
    if (!report) return;
    setGeneratingPdf(true);
    try {
      const doc = await generateReportPdf({
        report, organization, photos, workerSignature, clientSignature, lang: i18n.language,
      });
      doc.save(`izvjestaj-${report.task.title.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Greška pri generisanju PDF-a:', err);
      alert(t('reports.pdfError'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    setGeneratingPdf(true);
    try {
      const doc = await generateReportPdf({
        report, organization, photos, workerSignature, clientSignature, lang: i18n.language,
      });
      const blob = doc.output('blob');
      const filename = `izvjestaj-${report.task.title.replace(/\s+/g, '-')}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: report.task.title,
          text: t('reports.shareText', { title: report.task.title }),
        });
      } else {
        doc.save(filename);
        alert(t('reports.shareNotSupported'));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Greška pri dijeljenju:', err);
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!report || !recipientEmail) return;
    setSending(true);
    setSendStatus(null);
    try {
      const doc = await generateReportPdf({
        report, organization, photos, workerSignature, clientSignature, lang: i18n.language,
      });
      await sendReportByEmail({
        pdfDoc: doc,
        to: recipientEmail,
        subject: `${t('reports.title')}: ${report.task.title}`,
        taskTitle: report.task.title,
        api,
      });
      setSendStatus({ type: 'success', message: t('reports.sendSuccess') });
      setRecipientEmail('');
      setTimeout(() => setShowSendModal(false), 1500);
    } catch (err) {
      setSendStatus({ type: 'error', message: err.response?.data?.message || t('reports.sendError') });
    } finally {
      setSending(false);
    }
  };

  const ReportListPanel = () => (
    <div className="h-full w-full md:w-72 border-r border-gray-100 dark:border-gray-800 overflow-y-auto px-3 sm:px-4 py-4 bg-white dark:bg-gray-900 flex-shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('reports.title')}</h1>
        <input
          type="date"
          className="input text-xs sm:w-auto py-2 min-h-[44px]"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">{t('reports.noTasks')}</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task._id}
              onClick={() => loadReport(task)}
              className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                selected?._id === task._id
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
              }`}
            >
              <div className="font-medium text-gray-800 text-xs break-words">{task.title}</div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 break-words min-w-0 flex-1">{task.location}</span>
                <span className={`badge badge-${task.status} text-xs flex-shrink-0`}>
                  {t(`status.${task.status}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ReportDetailPanel = () => (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 h-full bg-gray-50 dark:bg-gray-950">
      {!selected ? (
        <div className="flex items-center justify-center h-full min-h-[40vh]">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center px-4">{t('reports.selectTask')}</p>
        </div>
      ) : reportLoading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">{t('reports.generating')}</div>
      ) : report ? (
        <div className="max-w-2xl mx-auto w-full">
          {/* Mobile back button + title */}
          <div className="md:hidden flex items-start gap-2 mb-4">
            <button
              onClick={handleBackToList}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 -ml-2"
              aria-label="Back"
            >
              ←
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{report.task.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                {format(new Date(report.task.scheduledDate), 'dd.MM.yyyy.')}
                {report.task.timeStart && ` · ${report.task.timeStart}${report.task.timeEnd ? ` – ${report.task.timeEnd}` : ''}`}
              </p>
            </div>
          </div>

          {/* Header + action buttons (desktop - original) */}
          <div className="hidden md:flex items-start justify-between mb-4 print-hidden gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{report.task.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                {format(new Date(report.task.scheduledDate), 'dd.MM.yyyy.')}
                {report.task.timeStart && ` · ${report.task.timeStart}${report.task.timeEnd ? ` – ${report.task.timeEnd}` : ''}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0 justify-end">
              <button className="btn text-xs" onClick={() => window.print()}>
                🖨 {t('common.print')}
              </button>
              <button className="btn text-xs" onClick={handleDownloadPdf} disabled={generatingPdf}>
                {generatingPdf ? t('reports.generatingPdf') : `⬇ ${t('reports.downloadPdf')}`}
              </button>
              <button className="btn text-xs" onClick={handleShare} disabled={generatingPdf}>
                📤 {t('reports.shareReport')}
              </button>
              <button className="btn btn-primary text-xs" onClick={() => setShowSendModal(true)}>
                ✉ {t('reports.sendReport')}
              </button>
            </div>
          </div>

          {/* Mobile action buttons — stacked */}
          <div className="md:hidden print-hidden mb-4">
            <div className="grid grid-cols-2 gap-2">
              <button className="btn text-xs" onClick={() => window.print()}>
                🖨 {t('common.print')}
              </button>
              <button className="btn text-xs" onClick={handleDownloadPdf} disabled={generatingPdf}>
                {generatingPdf ? '…' : `⬇ PDF`}
              </button>
              <button className="btn text-xs" onClick={handleShare} disabled={generatingPdf}>
                📤 {t('reports.shareReport')}
              </button>
              <button className="btn btn-primary text-xs" onClick={() => setShowSendModal(true)}>
                ✉ {t('reports.sendReport')}
              </button>
            </div>
          </div>

          {/* Fotografije */}
          <div className="card p-4 mb-4 print-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('reports.attachPhotos')}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">{t('reports.notStored')}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {photoPreviews.map((url, i) => (
                <div key={i} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-0 right-0 bg-black/60 text-white w-6 h-6 flex items-center justify-center rounded-bl flex-shrink-0"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-brand-400 hover:text-brand-400 transition-colors text-xl flex-shrink-0"
                aria-label="Add photo"
              >
                +
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {photos.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{photos.length} {t('reports.photosSelected')}</p>
            )}
          </div>

          <div className="card p-4 mb-4 print-hidden">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('reports.signatures')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignaturePad
                label={t('reports.workerSignatureLabel')}
                onChange={setWorkerSignature}
              />
              <SignaturePad
                label={t('reports.clientSignatureLabel')}
                onChange={setClientSignature}
              />
            </div>
          </div>

          {/* Printable area */}
          <div id="printable-area">
            <div className="print-only mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">FieldAssign</div>
                  {organization?.name && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 break-words">{organization.name}</div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <div>{t('reports.generated')}:</div>
                  <div>{format(new Date(), 'dd.MM.yyyy. HH:mm')}</div>
                </div>
              </div>
            </div>

            <div className="hidden print:block mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{report.task.title}</h2>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="card p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('reports.worker')}</div>
                <div className="text-sm font-medium break-words">{report.assignedTo?.name}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('reports.location')}</div>
                <div className="text-sm font-medium break-words">{report.task.location || '—'}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('reports.totalActivities')}</div>
                <div className="text-sm font-medium">{report.summary.totalActivities}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('reports.duration')}</div>
                <div className="text-sm font-medium break-words">{report.summary.duration || '—'}</div>
              </div>
            </div>

            {/* GPS checkpoints */}
            {(report.gpsCheckpoints.accepted || report.gpsCheckpoints.arrival || report.gpsCheckpoints.completed) && (
              <div className="card p-4 mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('reports.gpsCheckpoints')}</div>
                <div className="space-y-2">
                  {report.gpsCheckpoints.accepted && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="badge badge-accepted flex-shrink-0">{t('reports.accepted')}</span>
                      <span className="text-gray-500 dark:text-gray-400 break-words">
                        {new Date(report.gpsCheckpoints.accepted.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{report.gpsCheckpoints.accepted.lat?.toFixed(5)}, {report.gpsCheckpoints.accepted.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                  {report.gpsCheckpoints.arrival && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="badge badge-inprogress flex-shrink-0">{t('reports.arrival')}</span>
                      <span className="text-gray-500 dark:text-gray-400 break-words">
                        {new Date(report.gpsCheckpoints.arrival.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{report.gpsCheckpoints.arrival.lat?.toFixed(5)}, {report.gpsCheckpoints.arrival.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                  {report.gpsCheckpoints.completed && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="badge badge-completed flex-shrink-0">{t('reports.finished')}</span>
                      <span className="text-gray-500 dark:text-gray-400 break-words">
                        {new Date(report.gpsCheckpoints.completed.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{report.gpsCheckpoints.completed.lat?.toFixed(5)}, {report.gpsCheckpoints.completed.lng?.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activities timeline */}
            <div className="card p-4">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{t('reports.activityTimeline')}</div>
              {report.activities.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('reports.noActivities')}</p>
              ) : (
                <div>
                  {report.activities.map((a, i) => (
                    <div key={i} className="timeline-item flex gap-3 pb-4 last:pb-0">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-brand-400 mt-0.5" />
                        {i < report.activities.length - 1 && <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-10 flex-shrink-0">{a.time}</span>
                          <span className="text-sm text-gray-800 break-words">{a.text}</span>
                        </div>
                        {a.note && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">{a.note}</div>}
                        {a.gps?.lat && <div className="text-xs text-brand-600 mt-0.5 break-words">📍 {t('reports.gps')}: {a.gps.lat?.toFixed(5)}, {a.gps.lng?.toFixed(5)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Foto preview na ekranu */}
            {photoPreviews.length > 0 && (
              <div className="card p-4 mt-4 print-hidden">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('reports.attachPhotos')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {photoPreviews.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-100 dark:border-gray-800" />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-right">
              {t('reports.generated')}: {format(new Date(report.generatedAt), 'dd.MM.yyyy. HH:mm')}
            </div>

            <div className="print-only mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-gray-500 dark:text-gray-400">
              <div><div className="border-t border-gray-400 pt-2">{t('reports.workerSignature')}</div></div>
              <div><div className="border-t border-gray-400 pt-2">{t('reports.companySignature')}</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">{t('reports.loadError')}</div>
      )}
    </div>
  );

  return (
    <div className="h-full md:flex md:overflow-hidden flex flex-col md:flex-row">
      <div className="md:hidden flex-1 overflow-hidden">
        {selected ? <ReportDetailPanel /> : <ReportListPanel />}
      </div>
      <div className="hidden md:flex md:h-full md:w-full">
        <ReportListPanel />
        <ReportDetailPanel />
      </div>

      {/* Send email modal */}
      {showSendModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={e => e.target === e.currentTarget && !sending && setShowSendModal(false)}
        >
          <div className="modal-panel max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('reports.sendReport')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 break-words">{t('reports.sendHint')}</p>

            {sendStatus && (
              <div className={`text-sm px-3 py-2 rounded-lg mb-4 break-words ${
                sendStatus.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
              }`}>
                {sendStatus.message}
              </div>
            )}

            <form onSubmit={handleSendReport} className="space-y-4">
              <div>
                <label className="label">{t('reports.recipientEmail')}</label>
                <input
                  type="email"
                  className="input"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="klijent@firma.com"
                  required
                  disabled={sending}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1 flex-wrap">
                <button type="button" className="btn" onClick={() => setShowSendModal(false)} disabled={sending}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? t('reports.sending') : t('reports.send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
