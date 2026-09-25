const repository = require('../repositories/supabaseRepository');
const { dateInZone } = require('./expenseSeries');

async function queueReminders(now = new Date()) {
  if (!repository.enabled()) return;
  const rows = await repository.query(repository.supabase.from('expense_series').select('*').eq('active', true).lte('next_date', new Date(now.getTime() + 2 * 86400000).toISOString().slice(0,10)).limit(100));
  for (const series of rows) {
    const tomorrow = dateInZone(series.time_zone, new Date(now.getTime() + 86400000));
    if (series.next_date !== tomorrow) continue;
    const ids = [...new Set([...(series.template.participants || []), ...(series.template.payers || [])].map((p) => p.userId))];
    const members = await repository.query(repository.supabase.from('group_members').select('user_id').eq('group_id', series.group_id));
    const notifications = members.filter((m) => ids.includes(m.user_id)).map((m) => ({ user_id: m.user_id, group_id: series.group_id, event_key: `series:${series.id}:${series.next_date}`, preference: 'recurringReminders', subject: 'Upcoming household bill', body: `${series.template.description || series.template.note} is scheduled for ${series.next_date}.` }));
    if (notifications.length) await repository.query(repository.supabase.from('notification_outbox').upsert(notifications, { onConflict: 'user_id,event_key', ignoreDuplicates: true }));
  }
}
async function deliver(transport) {
  if (!repository.enabled() || !transport) return { sent: 0 };
  const messages = await repository.query(repository.supabase.rpc('claim_notifications', { p_limit: 20 }));
  let sent = 0;
  for (const message of messages) {
    const change = (data) => repository.query(repository.supabase.from('notification_outbox').update(data).eq('id', message.id).eq('attempts', message.attempts));
    try {
      const profile = await repository.query(repository.supabase.from('profiles').select('email,notification_preferences').eq('id', message.user_id).single());
      const member = await repository.query(repository.supabase.from('group_members').select('user_id').eq('group_id', message.group_id).eq('user_id', message.user_id).maybeSingle());
      if (!member || !profile.email || profile.notification_preferences?.[message.preference] === false) { await change({ status: 'skipped', lease_until: null }); continue; }
      await transport.sendMail({ from: process.env.MAIL_FROM, to: profile.email, subject: message.subject, text: `${message.body}\n\nManage email preferences in RoomMate Settings.`, messageId: `<${message.id}@roommate-notifications>` });
      await change({ status: 'sent', lease_until: null, last_error: null }); sent++;
    } catch (error) {
      await change({ status: 'pending', lease_until: null, last_error: error.message, available_at: new Date(Date.now() + Math.min(3600, 2 ** message.attempts * 30) * 1000).toISOString() });
    }
  }
  return { sent };
}
function smtpTransport() {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) return null;
  return require('nodemailer').createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', requireTLS: process.env.SMTP_SECURE !== 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined, connectionTimeout: 10000, socketTimeout: 30000 });
}
module.exports = { queueReminders, deliver, smtpTransport };
