-- ============================================================================
--  ATA-TEX — révision 0009
--  Devis (commande non confirmée) + agenda (rendez-vous)
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0008.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  DEVIS : une commande peut être un devis tant qu'il n'est pas confirmé.
-- ---------------------------------------------------------------------------
alter table orders add column if not exists is_quote boolean not null default false;
alter table orders add column if not exists quote_valid_until date;

-- ---------------------------------------------------------------------------
--  AGENDA : prises de mesure, poses, rendez-vous
-- ---------------------------------------------------------------------------
create type appointment_kind as enum ('mesure', 'pose', 'livraison', 'rdv', 'autre');

create table appointments (
  id           uuid primary key default gen_random_uuid(),
  kind         appointment_kind not null default 'rdv',
  title        text not null default '',
  starts_at    timestamptz not null,
  duration_min integer not null default 60,
  client_id    uuid references clients (id) on delete set null,
  order_id     uuid references orders (id) on delete set null,
  location     text not null default '',
  notes        text not null default '',
  done         boolean not null default false,
  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index appointments_starts_idx on appointments (starts_at);

create trigger appointments_set_creator
  before insert on appointments
  for each row execute function set_created_by();

alter table appointments enable row level security;
create policy "appointments: tous" on appointments for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table appointments;
exception when duplicate_object then null; end $$;
