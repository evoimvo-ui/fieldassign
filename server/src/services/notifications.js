import User from '../models/User.js';
import { sendMail } from './mailer.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://fieldassign.ei-apps.com';

function emailWrapper(bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="border-bottom: 3px solid #1D9E75; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1D9E75; margin: 0;">FieldAssign</h2>
      </div>
      ${bodyHtml}
      <p style="color: #999; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
        Ovo je automatska obavijest iz FieldAssign aplikacije.
      </p>
    </div>
  `;
}

export async function notifyTaskAssigned(task) {
  try {
    const worker = await User.findOne({
      _id: task.assignedTo,
      active: { $ne: false },
    });
    if (!worker?.email) {
      console.log('Notify task assigned: radnik nije pronađen ili nema email', {
        assignedTo: task.assignedTo,
        taskId: task._id,
      });
      return;
    }

    const html = emailWrapper(`
      <p>Zdravo ${worker.name},</p>
      <p>Dodijeljen vam je novi zadatak:</p>
      <div style="background:#f5f5f5; border-radius:8px; padding:12px 16px; margin:16px 0;">
        <strong>${task.title}</strong><br/>
        ${task.location ? `📍 ${task.location}<br/>` : ''}
        ${task.timeStart ? `🕐 ${task.timeStart}${task.timeEnd ? ' – ' + task.timeEnd : ''}<br/>` : ''}
      </div>
      <p><a href="${FRONTEND_URL}/tasks" style="background:#1D9E75; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; display:inline-block;">Otvori zadatak</a></p>
    `);

    await sendMail({
      to: worker.email,
      subject: `Novi zadatak: ${task.title}`,
      html,
    });
  } catch (err) {
    console.error('Greška pri slanju notifikacije (task assigned):', err);
  }
}

export async function notifyAdminsStatusChange(task, status) {
  if (status !== 'completed' && status !== 'rejected') {
    console.log('Notify admins status change: status preskočen', { status, taskId: task?._id });
    return;
  }

  try {
    const admins = await User.find({
      organization: task.organization,
      role: 'admin',
      active: { $ne: false },
    });
    console.log('Notify admins status change: pronađeno admina', {
      count: admins.length,
      status,
      taskId: task._id,
      organization: task.organization,
      adminEmails: admins.map(a => a.email),
    });
    if (admins.length === 0) return;

    const statusLabel = status === 'completed' ? 'završen ✅' : 'odbijen ❌';
    const worker = await User.findById(task.assignedTo);

    const html = emailWrapper(`
      <p>Zadatak je ${statusLabel}:</p>
      <div style="background:#f5f5f5; border-radius:8px; padding:12px 16px; margin:16px 0;">
        <strong>${task.title}</strong><br/>
        ${task.location ? `📍 ${task.location}<br/>` : ''}
        ${worker ? `👤 ${worker.name}<br/>` : ''}
      </div>
      <p><a href="${FRONTEND_URL}/tasks" style="background:#1D9E75; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; display:inline-block;">Otvori u aplikaciji</a></p>
    `);

    const results = await Promise.allSettled(
      admins.map(admin =>
        sendMail({
          to: admin.email,
          subject: `Zadatak ${statusLabel}: ${task.title}`,
          html,
        })
      )
    );

    results.forEach((r, i) => {
      const email = admins[i]?.email;
      if (r.status === 'fulfilled') {
        console.log(`Notify admins status change: email poslan (${status})`, { to: email, taskId: task._id });
      } else {
        console.error(`Notify admins status change: NIJE POSLAN (${status})`, { to: email, taskId: task._id, error: r.reason?.message || r.reason });
      }
    });
  } catch (err) {
    console.error('Greška pri slanju notifikacije (status change):', err);
  }
}
