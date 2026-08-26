export const sendMail = async ({ to, subject, html, attachments }) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY nije postavljen u env varijablama');
    }

    const fromEmail = process.env.BREVO_FROM_EMAIL;
    const fromName = process.env.BREVO_FROM_NAME || 'FieldAssign';

    if (!fromEmail) {
      throw new Error('BREVO_FROM_EMAIL nije postavljen u env varijablama');
    }

    const recipients = Array.isArray(to) ? to : [to];
    const formattedTo = recipients.map(email => {
      if (typeof email === 'string') {
        return { email };
      }
      return email;
    });

    const payload = {
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: formattedTo,
      subject,
      htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachment = attachments.map(att => {
        if (att.content instanceof Buffer) {
          return {
            name: att.filename || att.name || 'attachment',
            content: att.content.toString('base64'),
          };
        }
        if (typeof att.content === 'string') {
          return {
            name: att.filename || att.name || 'attachment',
            content: att.content.includes('base64,')
              ? att.content.split('base64,')[1]
              : att.content,
          };
        }
        return {
          name: att.filename || att.name || 'attachment',
          content: att.content,
        };
      });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // invalid JSON, use raw text
      }
      const message = errorData.message || errorText || `HTTP ${response.status}`;
      throw new Error(`Brevo API greška (${response.status}): ${message}`);
    }

    const result = await response.json().catch(() => ({}));
    console.log(`Email poslan (Brevo API): messageId=${result.messageId || 'N/A'}, to=${formattedTo.map(r => r.email).join(', ')}`);
    return result;
  } catch (error) {
    console.error('Greška pri slanju emaila preko Brevo API-ja:', error.message);
    throw error;
  }
};

export default sendMail;
