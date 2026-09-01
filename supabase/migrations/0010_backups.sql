-- ============================================================================
--  ATA-TEX — révision 0010
--  Espace de stockage pour les sauvegardes automatiques hebdomadaires
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0009.
--  La sauvegarde automatique elle-même = GitHub Action (.github/workflows/backup.yml)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('backups', 'backups', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Bucket privé : seuls les administrateurs (via l'app) peuvent lister / télécharger.
drop policy if exists "backups: lecture admin" on storage.objects;
drop policy if exists "backups: ecriture" on storage.objects;
create policy "backups: lecture admin" on storage.objects
  for select to authenticated using (bucket_id = 'backups' and is_admin());
create policy "backups: ecriture" on storage.objects
  for insert to authenticated with check (bucket_id = 'backups' and is_admin());
