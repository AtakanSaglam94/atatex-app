-- ============================================================================
--  ATA-TEX — schéma initial
--  Commerce de tissus, voilages, rideaux, tentures et stores — Bruxelles
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor (une seule fois).
--  Le fichier supabase/seed.sql doit être exécuté ENSUITE.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Types énumérés
-- ---------------------------------------------------------------------------
create type user_role          as enum ('admin', 'travailleur');
create type product_unit       as enum ('m', 'piece', 'paquet_100', 'kit');
create type confection_categ   as enum ('rideau_voilage', 'tenture', 'store');
create type order_status        as enum ('recue', 'fabrication', 'pret', 'termine');
create type order_fulfillment   as enum ('retrait', 'livraison');
create type discount_kind       as enum ('none', 'montant', 'pourcent');
create type order_item_kind     as enum ('produit', 'service', 'libre');

-- ---------------------------------------------------------------------------
--  profiles — un enregistrement par utilisateur (lié à auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'travailleur',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Crée automatiquement le profil à l'inscription d'un utilisateur
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'travailleur')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper : l'utilisateur courant est-il admin ?
create function is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- ---------------------------------------------------------------------------
--  company — coordonnées de l'entreprise (une seule ligne)
-- ---------------------------------------------------------------------------
create table company (
  id            smallint primary key default 1 check (id = 1),
  name          text not null default '',
  legal_form    text not null default '',
  vat           text not null default '',
  address       text not null default '',
  iban          text not null default '',
  email         text not null default '',
  phone         text not null default '',
  vat_rate      numeric(5, 2) not null default 21,
  invoice_terms text not null default 'Paiement à réception de la facture.',
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Compteurs de numérotation (commandes / factures) — séquentiels par année
-- ---------------------------------------------------------------------------
create table number_sequences (
  kind   text not null,             -- 'order' | 'invoice'
  year   integer not null,
  value  integer not null default 0,
  primary key (kind, year)
);

-- Renvoie le prochain numéro formaté, ex. 'C-2026-0001' / 'F-2026-0001'
create function next_number(p_kind text, p_prefix text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  y integer := extract(year from now())::int;
  n integer;
begin
  insert into number_sequences (kind, year, value)
  values (p_kind, y, 1)
  on conflict (kind, year)
    do update set value = number_sequences.value + 1
  returning value into n;

  return p_prefix || '-' || y::text || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
--  Configuration : catégories de produits
-- ---------------------------------------------------------------------------
create table product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  position    integer not null default 0,
  -- largeur maximale (m) qui SURCHARGE celle du type de confection pour les
  -- produits de cette catégorie (ex. tentures = 2,50 m pour les stores). NULL = pas de surcharge.
  largeur_max numeric(8, 3),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Configuration : types de confection (NON codés en dur)
-- ---------------------------------------------------------------------------
create table confection_types (
  id                   uuid primary key default gen_random_uuid(),
  nom                  text not null,
  facteur              numeric(6, 3) not null check (facteur > 0),
  marge_fixe           numeric(6, 3) not null default 0 check (marge_fixe >= 0),
  frais_rideau_voilage numeric(10, 2) not null default 0 check (frais_rideau_voilage >= 0),
  frais_tenture        numeric(10, 2) not null default 0 check (frais_tenture >= 0),
  frais_store          numeric(10, 2) not null default 0 check (frais_store >= 0),
  -- limites de largeur autorisées (m). NULL = pas de limite.
  largeur_min          numeric(8, 3),
  largeur_max          numeric(8, 3),
  active               boolean not null default true,
  position             integer not null default 0,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Configuration : services facturables
-- ---------------------------------------------------------------------------
create table services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(10, 2) not null default 0 check (price >= 0),
  active      boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Catalogue produits
-- ---------------------------------------------------------------------------
create table products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  sku                 text not null default '',
  category_id         uuid references product_categories (id) on delete set null,
  price               numeric(10, 2) not null default 0 check (price >= 0),
  unit                product_unit not null default 'm',
  stock               numeric(10, 2) not null default 0,
  low_stock_at        numeric(10, 2) not null default 0,
  -- quantité maximale sur une seule ligne de commande (ex. rail = 6 m).
  -- NULL = pas de limite. Au-delà, l'utilisateur ajoute une 2e ligne.
  max_qty_per_line    numeric(10, 3),
  -- catégorie de confection : détermine quelle colonne de frais s'applique
  -- (rideau_voilage → frais_rideau_voilage, tenture → frais_tenture, store → frais_store).
  -- NULL pour les articles non confectionnables (accessoires, ruflettes…).
  confection_category confection_categ,
  photo_url           text not null default '',
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index products_category_idx on products (category_id);

-- ---------------------------------------------------------------------------
--  Clients
-- ---------------------------------------------------------------------------
create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  vat         text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Commandes
-- ---------------------------------------------------------------------------
create table orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique,
  client_id      uuid not null references clients (id) on delete restrict,
  order_date     date not null default current_date,
  status         order_status not null default 'recue',
  fulfillment    order_fulfillment not null default 'retrait',
  discount_type  discount_kind not null default 'none',
  discount_value numeric(10, 2) not null default 0 check (discount_value >= 0),
  round_total    boolean not null default false,
  deposit_amount numeric(10, 2) not null default 0 check (deposit_amount >= 0),
  notes          text not null default '',
  invoice_number text unique,
  invoiced_at    timestamptz,
  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index orders_client_idx on orders (client_id);
create index orders_status_idx on orders (status);
create index orders_date_idx on orders (order_date);

-- Attribue le numéro de commande à la création
create function set_order_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := next_number('order', 'C');
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

create trigger orders_set_number
  before insert on orders
  for each row execute function set_order_number();

create function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();
create trigger products_touch before update on products
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
--  Lignes de commande
-- ---------------------------------------------------------------------------
create table order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders (id) on delete cascade,
  position              integer not null default 0,
  kind                  order_item_kind not null,

  -- libellé figé (produit/service supprimé plus tard = facture inchangée)
  label                 text not null default '',
  unit                  product_unit,
  qty                   numeric(10, 3) not null default 1,
  unit_price            numeric(10, 2) not null default 0,
  line_total            numeric(12, 2) not null default 0,

  -- référence d'origine (peut devenir NULL si l'élément est supprimé)
  product_id            uuid references products (id) on delete set null,
  service_id            uuid references services (id) on delete set null,

  -- confection sur mesure : valeurs figées au moment de la commande
  is_confection         boolean not null default false,
  confection_type_id    uuid references confection_types (id) on delete set null,
  confection_type_label text not null default '',
  confection_category   confection_categ,
  largeur               numeric(8, 3),   -- largeur souhaitée (m)
  facteur               numeric(6, 3),
  marge_fixe            numeric(6, 3),
  frais_confection      numeric(10, 2),
  metrage               numeric(10, 2),  -- m calculé, à commander

  created_at            timestamptz not null default now()
);
create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
--  Modèles d'emails (un par étape du parcours)
-- ---------------------------------------------------------------------------
create table email_templates (
  template_key text primary key,   -- recue | fabrication | pret_retrait | pret_livraison | termine
  label        text not null,
  subject      text not null,
  body         text not null,
  enabled      boolean not null default true,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Journal des emails envoyés
-- ---------------------------------------------------------------------------
create table email_log (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders (id) on delete set null,
  template_key text not null,
  to_email     text not null,
  status       text not null default 'pending',   -- pending | sent | error
  error        text,
  created_at   timestamptz not null default now()
);
create index email_log_order_idx on email_log (order_id);

-- Note : le chiffre d'affaires agrégé (mensuel / annuel) est calculé côté
-- application et n'est affiché que pour le rôle "admin". Les totaux par commande
-- restent visibles par tous (nécessaires pour encaisser et suivre la fabrication).

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table profiles           enable row level security;
alter table company            enable row level security;
alter table number_sequences   enable row level security;
alter table product_categories enable row level security;
alter table confection_types   enable row level security;
alter table services           enable row level security;
alter table products           enable row level security;
alter table clients            enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table email_templates    enable row level security;
alter table email_log          enable row level security;

-- Tous les utilisateurs authentifiés peuvent lire les profils (affichage "créé par")
create policy "profiles: lecture" on profiles
  for select to authenticated using (true);
create policy "profiles: l'utilisateur modifie sa fiche" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin gère tout" on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- Empêche un travailleur de modifier son propre rôle ou son statut actif
create function guard_profile_changes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Seul un administrateur peut modifier le rôle ou le statut d''un compte';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on profiles
  for each row execute function guard_profile_changes();

-- Config : lecture pour tous, écriture pour admin
create policy "company: lecture" on company for select to authenticated using (true);
create policy "company: admin" on company for all to authenticated using (is_admin()) with check (is_admin());

create policy "categories: lecture" on product_categories for select to authenticated using (true);
create policy "categories: admin" on product_categories for all to authenticated using (is_admin()) with check (is_admin());

create policy "confection: lecture" on confection_types for select to authenticated using (true);
create policy "confection: admin" on confection_types for all to authenticated using (is_admin()) with check (is_admin());

create policy "services: lecture" on services for select to authenticated using (true);
create policy "services: admin" on services for all to authenticated using (is_admin()) with check (is_admin());

create policy "email_templates: lecture" on email_templates for select to authenticated using (true);
create policy "email_templates: admin" on email_templates for all to authenticated using (is_admin()) with check (is_admin());

-- Opérationnel : lecture + écriture pour tous les utilisateurs authentifiés
create policy "products: tous" on products for all to authenticated using (true) with check (true);
create policy "clients: tous" on clients for all to authenticated using (true) with check (true);
create policy "orders: tous" on orders for all to authenticated using (true) with check (true);
create policy "order_items: tous" on order_items for all to authenticated using (true) with check (true);
create policy "email_log: lecture" on email_log for select to authenticated using (true);
create policy "email_log: insertion" on email_log for insert to authenticated with check (true);

-- number_sequences : jamais manipulé directement par le client (via fonctions SECURITY DEFINER)
create policy "number_sequences: aucune" on number_sequences for select to authenticated using (false);

-- ============================================================================
--  Realtime — synchro live entre les 5 utilisateurs
-- ============================================================================
alter publication supabase_realtime add table
  orders, order_items, products, clients,
  product_categories, confection_types, services, email_templates, company;
