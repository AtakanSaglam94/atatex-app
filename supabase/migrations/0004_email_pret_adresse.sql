-- ============================================================================
--  ATA-TEX — révision 0004
--  Email « Prêt — retrait » : mention de l'adresse complète du point de retrait
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0003.
--  Variables : {client} {numero} {entreprise} {point} {jour} {adresse}
-- ============================================================================

update email_templates
set body = E'Bonjour {client},\n\nVotre commande {numero} est prête !\n\nOù la retirer :\n{point}{jour}\n{adresse}\n\nN''hésitez pas à nous contacter pour convenir d''un moment.\n\nÀ très bientôt,\n{entreprise}'
where template_key = 'pret_retrait';
