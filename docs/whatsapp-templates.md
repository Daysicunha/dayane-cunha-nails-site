# AgendaFlow One — modelos WhatsApp

Estes são os dois modelos que devem ser cadastrados e aprovados no WhatsApp Business Platform / Meta.

## 1. agendaflow_appointment_confirmation

Categoria sugerida: Utility
Idioma: pt_BR

Oi, {{1}}! 💅 Seu horário com Dayane Cunha Nails está confirmado.

*{{2}} — {{3}} às {{4}}*

📍 Borba Gato, Sabará

Até lá! 🤍

Variáveis:
1. primeiro nome da cliente
2. serviço
3. data
4. horário

## 2. agendaflow_appointment_reminder

Categoria sugerida: Utility
Idioma: pt_BR

Oi, {{1}}! Passando para lembrar do seu horário amanhã 💅

*{{2}} — {{3}} às {{4}}*

Dayane Cunha Nails
Te esperamos! 🤍

Variáveis:
1. primeiro nome da cliente
2. serviço
3. data
4. horário

## Variáveis de ambiente esperadas na Vercel

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_API_VERSION (opcional)
- WHATSAPP_CONFIRMATION_TEMPLATE (opcional; padrão: agendaflow_appointment_confirmation)
- WHATSAPP_REMINDER_TEMPLATE (opcional; padrão: agendaflow_appointment_reminder)
- CRON_SECRET

O lembrete deve ser acionado por um job recorrente no Supabase Cron, chamando `/api/reminders` com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
