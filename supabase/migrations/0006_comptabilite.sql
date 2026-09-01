-- ============================================================================
--  ATA-TEX — révision 0006
--  Comptabilité : dépenses / achats, catégories, justificatifs
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0005.
-- ============================================================================

create type expense_payment as enum ('especes', 'bancontact', 'virement', 'carte', 'autre');

-- ---------------------------------------------------------------------------
--  Catégories de dépenses (gérables par l'admin)
-- ---------------------------------------------------------------------------
create table expense_categories (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,
  position              integer not null default 0,
  -- % de TVA récupérable par défaut (ex. véhicule mixte = 35 %)
  vat_deductible_pct    numeric(5, 2) not null default 100 check (vat_deductible_pct between 0 and 100),
  created_at            timestamptz not null default now()
);

insert into expense_categories (name, position, vat_deductible_pct) values
  ('Achat marchandises / tissus',        10, 100),
  ('Sous-traitance / confection externe', 20, 100),
  ('Loyer & charges locatives',           30, 100),
  ('Énergie (électricité, gaz…)',         40, 100),
  ('Véhicule & carburant',                50, 35),
  ('Frais de marché / emplacement',       60, 100),
  ('Fournitures & petit matériel',        70, 100),
  ('Assurances',                          80, 0),
  ('Honoraires (comptable, conseil…)',    90, 100),
  ('Publicité & marketing',              100, 100),
  ('Frais bancaires',                    110, 0),
  ('Télécom & logiciels',                120, 100),
  ('Autre',                              900, 100);

-- ---------------------------------------------------------------------------
--  Dépenses / achats
-- ---------------------------------------------------------------------------
create table expenses (
  id                 uuid primary key default gen_random_uuid(),
  expense_date       date not null default current_date,
  supplier           text not null default '',
  category_id        uuid references expense_categories (id) on delete set null,
  description        text not null default '',
  amount_ttc         numeric(12, 2) not null default 0 check (amount_ttc >= 0),
  vat_rate           numeric(5, 2) not null default 21 check (vat_rate >= 0),
  -- part de TVA récupérable (0–100) ; 0 = aucune récupération
  vat_deductible_pct numeric(5, 2) not null default 100 check (vat_deductible_pct between 0 and 100),
  payment_method     expense_payment not null default 'virement',
  receipt_url        text not null default '',
  notes              text not null default '',
  created_by         uuid references profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index expenses_date_idx on expenses (expense_date);
create index expenses_category_idx on expenses (category_id);

create function set_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;
create trigger expenses_set_creator
  before insert on expenses
  for each row execute function set_created_by();

-- ---------------------------------------------------------------------------
--  Justificatifs (bucket public — accès restreint aux admins via l'app)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

drop policy if exists "receipts: lecture publique" on storage.objects;
drop policy if exists "receipts: ecriture authentifiee" on storage.objects;
drop policy if exists "receipts: suppression authentifiee" on storage.objects;
create policy "receipts: lecture publique" on storage.objects
  for select using (bucket_id = 'receipts');
create policy "receipts: ecriture authentifiee" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipts');
create policy "receipts: suppression authentifiee" on storage.objects
  for delete to authenticated using (bucket_id = 'receipts');

-- ---------------------------------------------------------------------------
--  RLS — comptabilité réservée aux administrateurs
-- ---------------------------------------------------------------------------
alter table expense_categories enable row level security;
alter table expenses enable row level security;

create policy "expense_categories: lecture admin" on expense_categories
  for select to authenticated using (is_admin());
create policy "expense_categories: ecriture admin" on expense_categories
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "expenses: admin" on expenses
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
--  Realtime
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table expense_categories;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table expenses;
exception when duplicate_object then null; end $$;
