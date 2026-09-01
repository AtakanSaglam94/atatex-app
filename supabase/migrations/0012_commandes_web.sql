-- ============================================================================
--  ATA-TEX — révision 0012
--  Commandes passées depuis la boutique en ligne (ata-tex.be)
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0011.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Commandes : origine + livraison + état du paiement
-- ---------------------------------------------------------------------------
alter table orders add column if not exists channel text not null default 'magasin';
--   'magasin' : créée dans l'app de gestion  |  'web' : passée sur le site
alter table orders add column if not exists shipping_fee numeric(10, 2) not null default 0;
alter table orders add column if not exists payment_status text not null default 'manuel';
--   'manuel'     : encaissement géré à la main (commandes magasin)
--   'en_attente' : commande web, paiement pas encore confirmé
--   'paye'       : payé en ligne (Mollie) — posé par le webhook (phase 3)
alter table orders add column if not exists customer_message text not null default '';
--   message laissé par le client au checkout

create index if not exists orders_channel_idx on orders (channel) where channel <> 'magasin';

-- ---------------------------------------------------------------------------
--  Frais de livraison à domicile (réglable dans l'app : Réglages → Entreprise)
-- ---------------------------------------------------------------------------
alter table company add column if not exists shipping_fee_home numeric(10, 2) not null default 0;
alter table company add column if not exists free_shipping_threshold numeric(10, 2);
--   NULL = pas de franco ; sinon livraison offerte au-dessus de ce montant TTC

-- ---------------------------------------------------------------------------
--  Réglages exposés à la boutique (frais de port) — vue restreinte : le
--  public ne voit QUE ces deux colonnes, jamais le reste de `company`.
-- ---------------------------------------------------------------------------
drop view if exists web_settings;
create view web_settings as
  select shipping_fee_home, free_shipping_threshold
  from company
  where id = 1;
grant select on web_settings to anon;

-- ---------------------------------------------------------------------------
--  La création de commandes web passe par l'Edge Function `create-web-order`
--  (service_role, revalidation des prix côté serveur). AUCUNE policy anonyme
--  d'écriture sur orders / order_items / clients — le public ne peut pas
--  écrire directement en base.
-- ---------------------------------------------------------------------------
