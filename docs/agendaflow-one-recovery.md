# AgendaFlow One — Recovery Snapshot

Snapshot consolidado em 08/09/2026 para evitar perda de contexto entre conversas.

## Projeto
AgendaFlow One é o sistema de agendamento da Daysi Cunha, com Dayane Cunha Nails como primeira aplicação real.

## Rotas principais
- `/agendar/` — fluxo público da cliente
- `/painel/` — painel da profissional

## Fluxo público
Serviço → Data → Horário → Nome + WhatsApp → Confirmação

## Painel
- Hoje
- Agenda
- Novo agendamento
- Bloquear horário
- Serviços
- Horários
- Clientes

## Arquivos do AgendaFlow One
### Interface
- `agendar/index.html`
- `painel/index.html`
- `assets/css/agendaflow-one.css`
- `assets/js/agendaflow-one.js`
- `assets/js/agendaflow-whatsapp.js`

### Backend/API
- `api/_supabase.js`
- `api/_whatsapp.js`
- `api/book.js`
- `api/reminders.js`

### Banco
- `supabase/agenda-flow-one.sql`

### Documentação
- `docs/whatsapp-templates.md`

## Regras do MVP
- impedir sobreposição de horários;
- considerar duração do serviço;
- respeitar horário de atendimento;
- respeitar bloqueios;
- impedir horários cuja duração ultrapasse o expediente;
- manter agendamentos, clientes e serviços vinculados.

## Serviços iniciais
- Manicure — 60 min
- Pedicure — 60 min
- Cuticulagem — 60 min
- Pé e Mão — 120 min

## Integrações preparadas
- Supabase/PostgreSQL para persistência;
- WhatsApp Cloud API para confirmação;
- lembrete automático aproximadamente 24h antes;
- Vercel para publicação.

## Histórico relevante de commits
- `7645a6f` — booking preview
- `9013f62` — panel preview
- `e906284` — styles
- `e2de83c` — preview logic
- `38b06bc` — WhatsApp Cloud API helper
- `e678e91` — Supabase helper
- `ed6c8f4` — persistent booking endpoint
- `ad573b8` — Supabase schema/reminder claims
- `926ed3f` / `7ad1aa5` — confirmação WhatsApp
- `2b2bde0` — reminder scheduling adjustment
- `5b4c212` — templates WhatsApp
- `dd93199` — selected time mapping fix

## Fonte oficial do código
Repositório: `Daysicunha/dayane-cunha-nails-site`

Branch de backup deste snapshot:
`backup/agendaflow-one-2026-09-08`

Segredos e credenciais não devem ser gravados no repositório. Variáveis de ambiente ficam na Vercel/Supabase/Meta conforme o caso.
