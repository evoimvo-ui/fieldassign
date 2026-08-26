import sendMail from './mailer.js';

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('bs-BA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

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

export const sendTaskAssignedEmail = async (worker, task, organization) => {
  try {
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

    await sendMail(mailOptions);
    console.log(`Email poslan: Task assigned to ${worker.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task assigned):', error.message);
  }
};

export const sendTaskCompletedEmail = async (admin, worker, task) => {
  try {
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

    await sendMail(mailOptions);
    console.log(`Email poslan: Task completed to ${admin.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task completed):', error.message);
  }
};

export const sendTaskRejectedEmail = async (admin, worker, task, reason) => {
  try {
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

    await sendMail(mailOptions);
    console.log(`Email poslan: Task rejected to ${admin.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (task rejected):', error.message);
  }
};

export const sendWorkerCredentialsEmail = async (worker, tempPassword, organization, lang = 'bs') => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/login`;

    const isBS = lang === 'bs' || lang === 'sr' || lang === 'hr';

    const subject = isBS
      ? `Vaš FieldAssign nalog je spreman — ${organization?.name || 'FieldAssign'}`
      : `Your FieldAssign account is ready — ${organization?.name || 'FieldAssign'}`;

    const heading = isBS
      ? `Vaš nalog je kreiran`
      : `Your account has been created`;

    const greeting = isBS ? 'Pozdrav' : 'Hi';
    const intro = isBS
      ? `${organization?.name || 'Vaša organizacija'} vam je kreirala nalog na FieldAssign platformi. Koristite sljedeće podatke za prijavu:`
      : `${organization?.name || 'Your organization'} has created an account for you on the FieldAssign platform. Use the credentials below to sign in:`;

    const emailLabel = isBS ? 'Email' : 'Email';
    const passwordLabel = isBS ? 'Privremena lozinka' : 'Temporary password';

    const note = isBS
      ? 'Iz sigurnosnih razloga, bićete zamoljeni da odmah nakon prve uspješne prijave promijenite ovu privremenu lozinku.'
      : 'For security reasons, you will be required to change this temporary password immediately after your first successful login.';

    const ctaText = isBS ? 'Prijavite se sada' : 'Sign in now';

    const credentialsBlock = `
      <div style="margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <p style="margin: 8px 0; color: #555; font-size: 15px;"><strong style="color: #333;">${emailLabel}:</strong> ${worker.email}</p>
        <p style="margin: 8px 0; color: #555; font-size: 15px;"><strong style="color: #333;">${passwordLabel}:</strong> <code style="background: #fff; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-family: 'Inter', monospace; font-size: 15px; color: #1D9E75;">${tempPassword}</code></p>
      </div>
      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;">${note}</p>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="${isBS ? 'bs' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; }
          .email-container { max-width: 600px; margin: 0 auto; padding: 24px; }
          .header { background-color: #1D9E75; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
          .content { background-color: white; padding: 32px 24px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .heading { color: #333; font-size: 22px; margin: 0 0 16px 0; }
          .text { color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; }
          .cta-button { display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header"><h1>${organization?.name || 'FieldAssign'}</h1></div>
          <div class="content">
            <h2 class="heading">${greeting}, ${worker.name.split(' ')[0]}! 👋</h2>
            <p class="text">${intro}</p>
            ${credentialsBlock}
            <div style="text-align: center; margin: 28px 0 0 0;">
              <a href="${loginUrl}" class="cta-button">${ctaText}</a>
            </div>
          </div>
          <div class="footer"><p>FieldAssign — Task · Proof · Report</p></div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `${process.env.BREVO_FROM_NAME || 'FieldAssign'} <${process.env.BREVO_FROM_EMAIL}>`,
      to: worker.email,
      subject,
      html,
    };

    await sendMail(mailOptions);
    console.log(`Email poslan: Worker credentials -> ${worker.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (worker credentials):', error.message);
  }
};

export const sendVerificationEmail = async (user, token) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    const subject = 'Potvrdite svoj email — FieldAssign';
    const heading = 'Potvrdite svoju email adresu';
    const greeting = 'Pozdrav';
    const intro = 'Hvala vam što ste se registrovali na FieldAssign. Kliknite na dugme ispod da potvrdite svoju email adresu i aktivirate nalog.';
    const note = 'Ovaj link vrijedi 24 sata. Ako niste kreirali nalog, jednostavno zanemarite ovaj email.';
    const ctaText = 'Potvrdi email';

    const html = `
      <!DOCTYPE html>
      <html lang="bs">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; }
          .email-container { max-width: 600px; margin: 0 auto; padding: 24px; }
          .header { background-color: #1D9E75; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
          .content { background-color: white; padding: 32px 24px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .heading { color: #333; font-size: 22px; margin: 0 0 16px 0; }
          .text { color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; }
          .cta-button { display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header"><h1>FieldAssign</h1></div>
          <div class="content">
            <h2 class="heading">${greeting}, ${user.name.split(' ')[0]}! 👋</h2>
            <p class="text">${intro}</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyUrl}" class="cta-button">${ctaText}</a>
            </div>
            <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;">${note}</p>
          </div>
          <div class="footer"><p>FieldAssign — Task · Proof · Report</p></div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `${process.env.BREVO_FROM_NAME || 'FieldAssign'} <${process.env.BREVO_FROM_EMAIL}>`,
      to: user.email,
      subject,
      html,
    };

    await sendMail(mailOptions);
    console.log(`Email poslan: Verification -> ${user.email}`);
  } catch (error) {
    console.error('Greška pri slanju emaila (verification):', error.message);
    throw error;
  }
};
