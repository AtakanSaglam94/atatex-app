-- ============================================================================
--  ATA-TEX — révision 0011
--  Boutique en ligne (ata-tex.be) : produits publiables + lecture publique
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0010.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Produits : visibilité boutique
-- ---------------------------------------------------------------------------
alter table products add column if not exists published_online boolean not null default false;
alter table products add column if not exists online_description text not null default '';

create index if not exists products_online_idx on products (published_online) where published_online;

-- ---------------------------------------------------------------------------
--  Lecture PUBLIQUE (visiteurs non connectés) — strictement en lecture,
--  et uniquement ce qui est nécessaire à la vitrine.
-- ---------------------------------------------------------------------------

-- Produits publiés et actifs
drop policy if exists "products: vitrine publique" on products;
create policy "products: vitrine publique" on products
  for select to anon
  using (published_online = true and active = true);

-- Catégories (pour le filtre de la vitrine)
drop policy if exists "product_categories: vitrine publique" on product_categories;
create policy "product_categories: vitrine publique" on product_categories
  for select to anon
  using (true);

-- Types de confection actifs (configurateur sur mesure)
drop policy if exists "confection_types: vitrine publique" on confection_types;
create policy "confection_types: vitrine publique" on confection_types
  for select to anon
  using (active = true);

-- Points de retrait actifs (choix de livraison au checkout)
drop policy if exists "pickup_points: vitrine publique" on pickup_points;
create policy "pickup_points: vitrine publique" on pickup_points
  for select to anon
  using (active = true);

-- Note : les prix, stock et descriptions transitent en clair côté client —
-- c'est voulu (ce sont des infos de vitrine). Aucune donnée client/commande
-- n'est lisible en anonyme (aucune policy « anon » sur clients / orders).
