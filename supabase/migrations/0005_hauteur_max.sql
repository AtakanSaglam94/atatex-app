-- ============================================================================
--  ATA-TEX — révision 0005
--  Limites de hauteur par produit (confection sur mesure)
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0004.
-- ============================================================================

alter table products add column if not exists hauteur_min numeric(8, 3);
alter table products add column if not exists hauteur_max numeric(8, 3);

-- Exemple : une toile de 2,90 m de haut ne peut pas confectionner du 3 m.
-- À renseigner produit par produit dans la fiche (Stock).
