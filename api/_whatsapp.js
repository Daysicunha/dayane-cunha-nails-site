const META_GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function digits(value = '') {
  return String(value).replace(/\D/g, '');
}

function brPhone(value = '') {
  const phone = digits(value);
  if (!phone) return '';
  return phone.startsWith('55') ? phone : `55${phone}`;
}

async function sendTemplate({ to, template, language = 'pt_BR', parameters = [] }) {
  const token = required('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = required('WHATSAPP_PHONE_NUMBER_ID');
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: brPhone(to),
      type: 'template',
      template: {
        name: template,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text', text: String(text) }))
          }
        ]
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error?.message || `WhatsApp API error ${response.status}`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

module.exports = { sendTemplate, brPhone };
