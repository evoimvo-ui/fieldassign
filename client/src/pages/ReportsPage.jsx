import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import api from '../services/api.js';
import useAuthStore from '../store/authStore.js';
import { generateReportPdf, sendReportByEmail } from '../utils/generateReportPdf.js';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { organization } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Fotografije — postoje samo u memoriji browsera, nikad se ne upload-uju posebno
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // PDF export
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Send email modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // { type: 'success' | 'error', message }

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
        report, organization, photos, lang: i18n.language,
      });
      doc.save(`izvjestaj-${report.task.title.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Greška pri generisanju PDF-a:', err);
      alert(t('reports.pdfError'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Otvara nativni "Podijeli" meni telefona (WhatsApp, Viber, Email, Messages...)
  // Radi preko Web Share API-ja — nema backend-a, nema treće strane, nema troška.
  const handleShare = async () => {
    if (!report) return;
    setGeneratingPdf(true);
    try {
      const doc = await generateReportPdf({
        report, organization, photos, lang: i18n.language,
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
        // Fallback za desktop/browsere bez podrške — obično preuzimanje
        doc.save(filename);
        alert(t('reports.shareNotSupported'));
      }
    } catch (err) {
      // AbortError = korisnik je otkazao dijeljenje, nije prava greška
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
        report, organization, photos, lang: i18n.language,
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

            {/* Header + action buttons (ne printaju se) */}
            <div className="flex items-start justify-between mb-4 print-hidden">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{report.task.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(report.task.scheduledDate), 'dd.MM.yyyy.')}
                  {report.task.timeStart && ` · ${report.task.timeStart}${report.task.timeEnd ? ` – ${report.task.timeEnd}` : ''}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
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

            {/* Fotografije — dodaju se samo u PDF, ne čuvaju se nigdje (ne printa se) */}
            <div className="card p-4 mb-4 print-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('reports.attachPhotos')}
                </div>
                <span className="text-xs text-gray-400">{t('reports.notStored')}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-0 right-0 bg-black/60 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-400 transition-colors text-xl"
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
                <p className="text-xs text-gray-400">{photos.length} {t('reports.photosSelected')}</p>
              )}
            </div>

            {/* ==== Ono što se printa / ide u PDF preview na ekranu ==== */}
            <div id="printable-area">

              {/* Letterhead — vidljiv SAMO pri browser printanju */}
              <div className="print-only mb-6 pb-4 border-b-2 border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">FieldAssign</div>
                    {organization?.name && (
                      <div className="text-sm text-gray-600 mt-0.5">{organization.name}</div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{t('reports.generated')}:</div>
                    <div>{format(new Date(), 'dd.MM.yyyy. HH:mm')}</div>
                  </div>
                </div>
              </div>

              <div className="hidden print:block mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{report.task.title}</h2>
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
                      <div key={i} className="timeline-item flex gap-3 pb-4 last:pb-0">
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Foto preview u samom prikazu (na ekranu, ne u browser printu — u PDF-u će biti na kraju) */}
              {photoPreviews.length > 0 && (
                <div className="card p-4 mt-4 print-hidden">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('reports.attachPhotos')}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {photoPreviews.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-100" />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-400 text-right">
                {t('reports.generated')}: {format(new Date(report.generatedAt), 'dd.MM.yyyy. HH:mm')}
              </div>

              <div className="print-only mt-12 grid grid-cols-2 gap-8 text-xs text-gray-500">
                <div><div className="border-t border-gray-400 pt-2">{t('reports.workerSignature')}</div></div>
                <div><div className="border-t border-gray-400 pt-2">{t('reports.companySignature')}</div></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center py-12">{t('reports.loadError')}</div>
        )}
      </div>

      {/* Send email modal */}
      {showSendModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && !sending && setShowSendModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{t('reports.sendReport')}</h2>
            <p className="text-xs text-gray-400 mb-4">{t('reports.sendHint')}</p>

            {sendStatus && (
              <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${
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
              <div className="flex gap-2 justify-end pt-1">
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
