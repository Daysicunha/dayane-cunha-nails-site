const { supabaseRequest } = require('./_supabase');
const { sendTemplate } = require('./_whatsapp');

const ALLOWED_SERVICES = new Set(['manicure', 'pedicure', 'cuticulagem', 'pe-mao']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):00$/;

function cleanPhone(value = '') {
  return String(value).replace(/\D/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const { name, phone, serviceId, date, start } = req.body || {};
  const customerName = String(name || '').trim();
  const customerPhone = cleanPhone(phone);

  if (customerName.length < 2 || customerPhone.length < 10 || !ALLOWED_SERVICES.has(serviceId) || !DATE_RE.test(String(date || '')) || !TIME_RE.test(String(start || ''))) {
    return res.status(400).json({ ok: false, error: 'invalid_booking_data' });
  }

  try {
    const result = await supabaseRequest('/rest/v1/rpc/create_public_appointment', {
      method: 'POST',
      body: JSON.stringify({
        p_name: customerName,
        p_phone: customerPhone,
        p_service_id: serviceId,
        p_date: date,
        p_start_time: start
      })
    });

    const appointment = Array.isArray(result) ? result[0] : result;
    if (!appointment?.appointment_id) throw new Error('Appointment RPC returned no appointment_id');

    let whatsappSent = false;
    let whatsappError = null;
    try {
      await sendTemplate({
        to: customerPhone,
        template: process.env.WHATSAPP_CONFIRMATION_TEMPLATE || 'agendaflow_appointment_confirmation',
        parameters: [
          customerName.split(' ')[0],
          appointment.service_name,
          appointment.date_label,
          appointment.time_label
        ]
      });
      whatsappSent = true;
      await supabaseRequest(`/rest/v1/appointments?id=eq.${appointment.appointment_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmation_sent_at: new Date().toISOString(), confirmation_error: null })
      });
    } catch (error) {
      whatsappError = error.message;
      await supabaseRequest(`/rest/v1/appointments?id=eq.${appointment.appointment_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmation_error: String(error.message).slice(0, 500) })
      }).catch(() => null);
    }

    return res.status(201).json({
      ok: true,
      appointment,
      whatsapp: { sent: whatsappSent, error: whatsappSent ? null : 'confirmation_pending' }
    });
  } catch (error) {
    const unavailable = error?.payload?.code === 'P0001' || String(error.message).toLowerCase().includes('indispon');
    if (unavailable) return res.status(409).json({ ok: false, error: 'slot_unavailable' });

    const missingConfig = String(error.message).includes('Missing environment variable');
    if (missingConfig) return res.status(503).json({ ok: false, error: 'backend_not_configured' });

    console.error('booking_error', error);
    return res.status(500).json({ ok: false, error: 'booking_failed' });
  }
};
