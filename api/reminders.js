const { supabaseRequest } = require('./_supabase');
const { sendTemplate } = require('./_whatsapp');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ ok: false });

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const due = await supabaseRequest('/rest/v1/rpc/claim_due_reminders', {
      method: 'POST',
      body: JSON.stringify({ p_limit: 50 })
    });

    const rows = Array.isArray(due) ? due : [];
    const results = [];

    for (const appointment of rows) {
      try {
        await sendTemplate({
          to: appointment.phone,
          template: process.env.WHATSAPP_REMINDER_TEMPLATE || 'agendaflow_appointment_reminder',
          parameters: [
            String(appointment.customer_name || '').split(' ')[0],
            appointment.service_name,
            appointment.date_label,
            appointment.time_label
          ]
        });

        await supabaseRequest(`/rest/v1/appointments?id=eq.${appointment.appointment_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            reminder_sent_at: new Date().toISOString(),
            reminder_error: null
          })
        });
        results.push({ id: appointment.appointment_id, sent: true });
      } catch (error) {
        await supabaseRequest(`/rest/v1/appointments?id=eq.${appointment.appointment_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            reminder_claimed_at: null,
            reminder_error: String(error.message).slice(0, 500)
          })
        }).catch(() => null);
        results.push({ id: appointment.appointment_id, sent: false });
      }
    }

    return res.status(200).json({ ok: true, processed: rows.length, results });
  } catch (error) {
    console.error('reminder_job_error', error);
    return res.status(500).json({ ok: false, error: 'reminder_job_failed' });
  }
};
