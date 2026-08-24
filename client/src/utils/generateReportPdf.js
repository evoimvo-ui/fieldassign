import jsPDF from 'jspdf';

// Konvertuje File objekat u base64 dataURL (samo u memoriji browsera)
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Dohvata prirodne dimenzije slike da bi se sačuvao aspect ratio u PDF-u
function getImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });
}

/**
 * Generiše profesionalan PDF izvještaj sa opciono priloženim fotografijama.
 * Sve se dešava u browseru — fotografije se NIKAD ne šalju ni na jedan server
 * osim ako korisnik eksplicitno klikne "Pošalji" (vidi sendReportByEmail).
 */
export async function generateReportPdf({ report, organization, photos = [], lang = 'bs' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const L = lang === 'bs'
    ? {
        worker: 'Radnik', location: 'Lokacija', activities: 'Aktivnosti',
        duration: 'Trajanje', generated: 'Generisano', photos: 'Fotografije',
        workerSig: 'Potpis radnika', companySig: 'Potpis / pečat firme',
      }
    : {
        worker: 'Worker', location: 'Location', activities: 'Activities',
        duration: 'Duration', generated: 'Generated', photos: 'Photos',
        workerSig: 'Worker signature', companySig: 'Company signature/stamp',
      };

  const locale = lang === 'bs' ? 'bs-BA' : 'en-GB';

  // --- Letterhead ---
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('FieldAssign', margin, y);
  if (organization?.name) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(organization.name, margin, y + 6);
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${L.generated}: ${new Date().toLocaleString(locale)}`, pageWidth - margin, y, { align: 'right' });
  doc.setTextColor(0);
  y += 12;
  doc.setDrawColor(30);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Task title ---
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(report.task.title, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(90);
  const dateLine = `${new Date(report.task.scheduledDate).toLocaleDateString(locale)}` +
    (report.task.timeStart ? ` · ${report.task.timeStart}${report.task.timeEnd ? '–' + report.task.timeEnd : ''}` : '');
  doc.text(dateLine, margin, y);
  doc.setTextColor(0);
  y += 10;

  // --- Info grid ---
  const infoRows = [
    [L.worker, report.assignedTo?.name || '—'],
    [L.location, report.task.location || '—'],
    [L.activities, String(report.summary.totalActivities)],
    [L.duration, report.summary.duration || '—'],
  ];
  doc.setFontSize(10);
  infoRows.forEach(([k, v]) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${k}:`, margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(v), margin + 38, y);
    y += 6;
  });
  y += 4;

  // --- Activities timeline ---
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(L.activities, margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  report.activities.forEach((a) => {
    if (y > pageHeight - margin - 12) { doc.addPage(); y = margin; }
    doc.setFont(undefined, 'bold');
    doc.text(a.time, margin, y);
    doc.setFont(undefined, 'normal');
    const textLines = doc.splitTextToSize(a.text, pageWidth - margin * 2 - 20);
    doc.text(textLines, margin + 16, y);
    y += textLines.length * 4.5;
    if (a.note) {
      doc.setTextColor(120);
      const noteLines = doc.splitTextToSize(a.note, pageWidth - margin * 2 - 20);
      doc.text(noteLines, margin + 16, y);
      y += noteLines.length * 4.5;
      doc.setTextColor(0);
    }
    y += 2;
  });

  // --- Photos (ubačene direktno u PDF, nikad sačuvane nigdje) ---
  if (photos.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(L.photos, margin, y);
    y += 8;

    for (const file of photos) {
      const dataUrl = await fileToDataUrl(file);
      const { width, height } = await getImageSize(dataUrl);
      const maxW = pageWidth - margin * 2;
      const maxH = 90;
      let w = maxW;
      let h = (height / width) * w;
      if (h > maxH) { h = maxH; w = (width / height) * h; }

      if (y + h > pageHeight - margin) { doc.addPage(); y = margin; }
      const format = file.type.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, format, margin, y, w, h);
      y += h + 8;
    }
  }

  // --- Potpis linija ---
  if (y > pageHeight - 35) { doc.addPage(); y = margin; }
  const sigY = Math.max(y + 15, pageHeight - 30);
  doc.setDrawColor(150);
  doc.line(margin, sigY, margin + 70, sigY);
  doc.line(pageWidth - margin - 70, sigY, pageWidth - margin, sigY);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(L.workerSig, margin, sigY + 4);
  doc.text(L.companySig, pageWidth - margin - 70, sigY + 4);

  return doc;
}

/**
 * Šalje generisani PDF (+ fotografije koje su već unutar njega) emailom.
 * Server prima fajl SAMO u RAM memoriji (multer memoryStorage), odmah ga
 * proslijedi kroz email, i briše iz memorije — ništa se ne piše na disk/bazu.
 */
export async function sendReportByEmail({ pdfDoc, to, subject, taskTitle, api }) {
  const blob = pdfDoc.output('blob');
  const formData = new FormData();
  formData.append('pdf', blob, `izvjestaj-${Date.now()}.pdf`);
  formData.append('to', to);
  formData.append('subject', subject || '');
  formData.append('taskTitle', taskTitle || '');

  const { data } = await api.post('/reports/send-email', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
