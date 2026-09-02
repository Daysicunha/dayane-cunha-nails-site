-- AgendaFlow One — Dayane Cunha Nails
-- Execute em um projeto Supabase exclusivo do AgendaFlow One.

create extension if not exists btree_gist;

create table if not exists public.services (
  id text primary key,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes in (60,120)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.services (id,name,price,duration_minutes,active) values
  ('manicure','Manicure',35,60,true),
  ('pedicure','Pedicure',35,60,true),
  ('cuticulagem','Cuticulagem',20,60,true),
  ('pe-mao','Pé e Mão',60,120,true)
on conflict (id) do update set
  name=excluded.name,
  price=excluded.price,
  duration_minutes=excluded.duration_minutes,
  active=excluded.active;

create table if not exists public.business_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default false,
  check (end_time > start_time)
);

insert into public.business_hours (weekday,start_time,end_time,active) values
  (0,'08:00','18:00',false),
  (1,'08:00','18:00',false),
  (2,'08:00','18:00',true),
  (3,'08:00','18:00',true),
  (4,'08:00','18:00',true),
  (5,'08:00','18:00',true),
  (6,'07:00','18:00',true)
on conflict (weekday) do update set
  start_time=excluded.start_time,
  end_time=excluded.end_time,
  active=excluded.active;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  service_id text not null references public.services(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  price numeric(10,2) not null,
  status text not null default 'agendado' check (status in ('agendado','concluido','cancelado','nao_compareceu')),
  confirmation_sent_at timestamptz,
  confirmation_error text,
  reminder_claimed_at timestamptz,
  reminder_sent_at timestamptz,
  reminder_error text,
  created_at timestamptz not null default now(),
  period tstzrange generated always as (tstzrange(start_at,end_at,'[)')) stored,
  check (end_at > start_at)
);

alter table public.appointments
  drop constraint if exists appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (period with &&)
  where (status = 'agendado');

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  period tstzrange generated always as (tstzrange(start_at,end_at,'[)')) stored,
  check (end_at > start_at)
);

alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.blocks enable row level security;

revoke all on public.services, public.business_hours, public.customers, public.appointments, public.blocks from anon, authenticated;
grant select, insert, update, delete on public.services, public.business_hours, public.customers, public.appointments, public.blocks to service_role;

create or replace function public.create_public_appointment(
  p_name text,
  p_phone text,
  p_service_id text,
  p_date date,
  p_start_time time
)
returns table(
  appointment_id uuid,
  service_name text,
  date_label text,
  time_label text,
  duration_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_hours public.business_hours%rowtype;
  v_customer_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_local_end time;
  v_period tstzrange;
begin
  perform pg_advisory_xact_lock(hashtext(p_date::text));

  select * into v_service from public.services where id=p_service_id and active=true;
  if not found then raise exception 'Serviço indisponível'; end if;

  select * into v_hours from public.business_hours where weekday=extract(dow from p_date)::smallint and active=true;
  if not found then raise exception 'Data indisponível'; end if;

  if extract(minute from p_start_time) <> 0 or extract(second from p_start_time) <> 0 then
    raise exception 'Horário precisa iniciar em hora cheia';
  end if;

  v_start := (p_date + p_start_time) at time zone 'America/Sao_Paulo';
  v_end := v_start + make_interval(mins => v_service.duration_minutes);
  v_local_end := (v_end at time zone 'America/Sao_Paulo')::time;
  v_period := tstzrange(v_start,v_end,'[)');

  if v_start <= now() then raise exception 'Horário indisponível'; end if;
  if p_start_time < v_hours.start_time or v_local_end > v_hours.end_time then raise exception 'Horário fora do expediente'; end if;

  if exists(select 1 from public.blocks where period && v_period) then
    raise exception 'Horário indisponível';
  end if;

  if exists(select 1 from public.appointments where status='agendado' and period && v_period) then
    raise exception 'Horário indisponível';
  end if;

  insert into public.customers(name,phone)
  values (trim(p_name),regexp_replace(p_phone,'\\D','','g'))
  on conflict (phone) do update set name=excluded.name, updated_at=now()
  returning id into v_customer_id;

  insert into public.appointments(customer_id,service_id,start_at,end_at,price,status)
  values(v_customer_id,v_service.id,v_start,v_end,v_service.price,'agendado')
  returning id into appointment_id;

  service_name := v_service.name;
  date_label := to_char(p_date,'DD/MM/YYYY');
  time_label := to_char(p_start_time,'HH24:MI');
  duration_minutes := v_service.duration_minutes;
  return next;
end;
$$;

revoke all on function public.create_public_appointment(text,text,text,date,time) from public, anon, authenticated;
grant execute on function public.create_public_appointment(text,text,text,date,time) to service_role;

create or replace function public.claim_due_reminders(p_limit integer default 50)
returns table(
  appointment_id uuid,
  customer_name text,
  phone text,
  service_name text,
  date_label text,
  time_label text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select a.id
    from public.appointments a
    where a.status='agendado'
      and a.reminder_sent_at is null
      and (a.reminder_claimed_at is null or a.reminder_claimed_at < now() - interval '30 minutes')
      and a.start_at >= now() + interval '23 hours'
      and a.start_at <  now() + interval '25 hours'
    order by a.start_at
    for update skip locked
    limit greatest(1,least(p_limit,100))
  ), claimed as (
    update public.appointments a
    set reminder_claimed_at=now()
    from due
    where a.id=due.id
    returning a.*
  )
  select
    c.id,
    cu.name,
    cu.phone,
    s.name,
    to_char(c.start_at at time zone 'America/Sao_Paulo','DD/MM/YYYY'),
    to_char(c.start_at at time zone 'America/Sao_Paulo','HH24:MI')
  from claimed c
  join public.customers cu on cu.id=c.customer_id
  join public.services s on s.id=c.service_id;
end;
$$;

revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
