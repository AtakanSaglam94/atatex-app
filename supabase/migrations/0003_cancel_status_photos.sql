-- ============================================================================
--  ATA-TEX — révision 0003
--  Statut « Annulée » · photos multiples par produit (stockage Supabase)
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0002.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  STATUT « ANNULÉE »
--  (nouvelle valeur d'enum — n'est utilisée nulle part dans ce script)
-- ---------------------------------------------------------------------------
alter type order_status add value if not exists 'annule';

-- Modèle d'email d'annulation (désactivable dans Réglages → Emails)
insert into email_templates (template_key, label, subject, body, enabled)
select 'annule', 'Commande annulée',
       'Votre commande {numero} a été annulée',
       E'Bonjour {client},\n\nVotre commande {numero} a été annulée. Si vous avez déjà versé un acompte, il vous sera remboursé — nous vous recontactons à ce sujet.\nPour toute question, répondez simplement à cet email.\n\nCordialement,\n{entreprise}',
       true
where not exists (select 1 from email_templates where template_key = 'annule');

-- ---------------------------------------------------------------------------
--  PHOTOS MULTIPLES PAR PRODUIT
-- ---------------------------------------------------------------------------
alter table products add column if not exists photo_urls text[] not null default '{}';

-- Reprise de l'éventuelle photo unique existante
update products
set photo_urls = array[photo_url]
where photo_url <> '' and cardinality(photo_urls) = 0;

-- ---------------------------------------------------------------------------
--  STOCKAGE DES PHOTOS (bucket public)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Lecture publique + écriture/suppression pour les utilisateurs connectés
drop policy if exists "product-photos: lecture publique" on storage.objects;
drop policy if exists "product-photos: envoi authentifie" on storage.objects;
drop policy if exists "product-photos: maj authentifiee" on storage.objects;
drop policy if exists "product-photos: suppression authentifiee" on storage.objects;

create policy "product-photos: lecture publique" on storage.objects
  for select using (bucket_id = 'product-photos');
create policy "product-photos: envoi authentifie" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');
create policy "product-photos: maj authentifiee" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');
create policy "product-photos: suppression authentifiee" on storage.objects
  for delete to authenticated using (bucket_id = 'product-photos');
