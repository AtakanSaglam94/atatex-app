-- ============================================================================
--  ATA-TEX — révision 0007
--  Rouleaux de tissu (plusieurs par modèle) + code-barres
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0006.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  CODE-BARRES sur les produits
-- ---------------------------------------------------------------------------
alter table products add column if not exists barcode text not null default '';
create index if not exists products_barcode_idx on products (barcode) where barcode <> '';

-- ---------------------------------------------------------------------------
--  ROULEAUX
--  Le métrage restant d'un rouleau se déduit : longueur initiale + ajustement
--  manuel − métrage consommé par les commandes non annulées (calcul côté app).
-- ---------------------------------------------------------------------------
create table stock_rolls (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products (id) on delete cascade,
  label              text not null default '',      -- ex. "Rouleau A", "Lot 2024-03"
  length_initial     numeric(10, 2) not null default 0 check (length_initial >= 0),
  -- corrections physiques (perte, re-métrage) : + ou −
  manual_adjustment  numeric(10, 2) not null default 0,
  location           text not null default '',
  barcode            text not null default '',
  received_at        date,
  notes              text not null default '',
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);
create index stock_rolls_product_idx on stock_rolls (product_id);
create index stock_rolls_barcode_idx on stock_rolls (barcode) where barcode <> '';

-- lien ligne de commande → rouleau découpé
alter table order_items add column if not exists roll_id uuid references stock_rolls (id) on delete set null;

-- ---------------------------------------------------------------------------
--  RLS + Realtime
-- ---------------------------------------------------------------------------
alter table stock_rolls enable row level security;
create policy "stock_rolls: tous" on stock_rolls for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table stock_rolls;
exception when duplicate_object then null; end $$;
