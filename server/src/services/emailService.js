import nodemailer from 'nodemailer';

// Kreiraj transporter za Brevo SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    secure: false, // true za 465, false za 587
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });
};

// Helper za formatiranje datuma
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('bs-BA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// HTML template za email
const createEmailTemplate = (options) => {
  const { organizationName, subject, heading, content, task, ctaText, ctaUrl } = options;

  const taskDetails = task ? `
    <div style="margin: 24px 0; padding: 16px; background-color: #f8f9fa; border-radius: 8px;">
      <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">Detalji zadatka</h4>
      <p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Naziv:</strong> ${task.title}</p>
      <p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Prioritet:</strong> ${task.priority === 'high' ? 'Visok' : task.priority === 'medium' ? 'Srednji' : 'Nizak'}</p>
      ${task.location ? `<p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Lokacija:</strong> ${task.location}</p>` : ''}
      ${task.timeStart ? `<p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Vrijeme:</strong> ${task.timeStart}${task.timeEnd ? ` - ${task.timeEnd}` : ''}</p>` : ''}
      ${task.scheduledDate ? `<p style="margin: 8px 0; color: #555; font-size: 14px;"><strong>Datum:</strong> ${formatDate(task.scheduledDate)}</p>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="bs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f0f2f5;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }
        .header {
          background-color: #1D9E75;
          color: white;
          padding: 20px 24px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .content {
          background-color: white;
          padding: 32px 24px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .heading {
          color: #333;
          font-size: 22px;
          margin: 0 0 16px 0;
        }
        .text {
          color: #555;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #1D9E75;
          color: white;
          padding: 12px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 16px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${organizationName || 'FieldAssign'}</h1>
        </div>
        <div class="content">
          <h2 class="heading">${heading}</h2>
          <p class="text">${content}</p>
          ${taskDetails}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${ctaUrl}" class="cta-button">${ctaText || 'Pogledaj zadatak'}</a>
          </div>
        </div>
        <div class="footer">
          <p>FieldAssign — Task · Proof · Report</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Pošalji email kada je zadatak dodijeljen workeru
export const sendTaskAssignedEmail = async (worker, task, organization) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const taskUrl = `${frontendUrl}/tasks/${task._id}`;

    const mailOptions = {
      from: `${process.env.BREVO_FROM_NAME || 'FieldAssign'} <${process.env.BREVO_FROM_EMAIL}>`,
      to: worker.email,
      subject: `Novi zadatak: ${task.title}`,
      html: createEmailTemplate({
        organizationName: organization?.name,
        subject: `Novi zadatak: ${task.title}`,
        heading: `Dodijeljen ti je novi zadatak!`,
        content: `${organization?.name || 'Vaša organizacija'} je dodijelila novi zadatak. Pogledaj detalje ispod i započni rad.`,
        task,
        ctaUrl: taskUrl,
        ctaText: 'Pogledaj zadatak',
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email poslan: Task assigned to ${worker.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task assigned):', error.message);
    // Ne bacamo grešku jer ne želimo blokirati glavni flow
  }
};

// Pošalji email kada je zadatak završen
export const sendTaskCompletedEmail = async (admin, worker, task) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const taskUrl = `${frontendUrl}/tasks/${task._id}`;

    const mailOptions = {
      from: `${process.env.BREVO_FROM_NAME || 'FieldAssign'} <${process.env.BREVO_FROM_EMAIL}>`,
      to: admin.email,
      subject: `Zadatak završen: ${task.title}`,
      html: createEmailTemplate({
        organizationName: worker.organization?.name || 'Vaša organizacija',
        subject: `Zadatak završen: ${task.title}`,
        heading: `Zadatak je završen!`,
        content: `${worker.name} je završio zadatak "${task.title}". Pogledaj detalje i izvještaj.`,
        task,
        ctaUrl: taskUrl,
        ctaText: 'Pogledaj izvještaj',
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email poslan: Task completed to ${admin.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task completed):', error.message);
  }
};

// Pošalji email kada je zadatak odbijen
export const sendTaskRejectedEmail = async (admin, worker, task, reason) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const taskUrl = `${frontendUrl}/tasks/${task._id}`;

    const mailOptions = {
      from: `${process.env.BREVO_FROM_NAME || 'FieldAssign'} <${process.env.BREVO_FROM_EMAIL}>`,
      to: admin.email,
      subject: `Zadatak odbijen: ${task.title}`,
      html: createEmailTemplate({
        organizationName: worker.organization?.name || 'Vaša organizacija',
        subject: `Zadatak odbijen: ${task.title}`,
        heading: `Zadatak je odbijen`,
        content: `${worker.name} je odbio zadatak "${task.title}".${reason ? ` Razlog: ${reason}` : ''}`,
        task,
        ctaUrl: taskUrl,
        ctaText: 'Pogledaj zadatak',
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email poslan: Task rejected to ${admin.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task rejected):', error.message);
  }
};
