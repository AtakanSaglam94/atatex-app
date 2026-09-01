-- ============================================================================
--  ATA-TEX — révision 0008
--  Email d'avis automatique 7 jours après « Terminé »
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0007.
--  ⚠ La planification (cron) est en bas — voir les instructions.
-- ============================================================================

alter table company add column if not exists google_review_url text not null default '';
alter table company add column if not exists website_url text not null default '';

insert into email_templates (template_key, label, subject, body, enabled)
select 'avis', 'Demande d''avis (J+7)',
       'Votre avis sur votre commande {numero}',
       E'Bonjour {client},\n\nVous avez récupéré votre commande {numero} il y a quelques jours — nous espérons qu''elle vous plaît !\n\nUn petit avis nous aiderait beaucoup : {lien_google}\n\nMerci et à bientôt,\n{entreprise}\n{lien_site}',
       true
where not exists (select 1 from email_templates where template_key = 'avis');

-- ---------------------------------------------------------------------------
--  PLANIFICATION  —  à exécuter séparément une fois la fonction Edge déployée
--  (voir supabase/functions/send-review-emails/index.ts)
-- ---------------------------------------------------------------------------
--  1. Déployer la fonction `send-review-emails` (Dashboard ou CLI).
--  2. Définir le secret :  Edge Functions → Secrets →  CRON_SECRET = <une phrase au hasard>
--  3. Activer les extensions puis planifier (remplace <CRON_SECRET> et <PROJECT_REF>) :
--
--     create extension if not exists pg_cron;
--     create extension if not exists pg_net;
--
--     select cron.schedule('atatex-avis-quotidien', '0 9 * * *', $CRON$
--       select net.http_post(
--         url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-review-emails',
--         headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', '<CRON_SECRET>')
--       );
--     $CRON$);
--
--  Pour arrêter :  select cron.unschedule('atatex-avis-quotidien');
-- ---------------------------------------------------------------------------
