# À faire au retour — mises à jour base + fonctions

Fais ça **dans l'ordre**. Sans les migrations, la création de commandes / dépenses /
rendez-vous plantera (colonnes manquantes).

## 1. Migrations SQL (Supabase → SQL Editor → new snippet → coller → Run)

Copie chaque fichier depuis GitHub (bouton « copier le fichier brut »), un par un :

| # | Fichier | Ce que ça ajoute |
|---|---|---|
| 0004 | `supabase/migrations/0004_email_pret_adresse.sql` | adresse du point de retrait dans l'email « Prêt » |
| 0005 | `supabase/migrations/0005_hauteur_max.sql` | limites de hauteur par produit |
| 0006 | `supabase/migrations/0006_comptabilite.sql` | dépenses, catégories, bucket `receipts` |
| 0007 | `supabase/migrations/0007_rouleaux_codebarres.sql` | rouleaux de tissu + code-barres |
| 0008 | `supabase/migrations/0008_avis_relance.sql` | email d'avis J+7 (template + colonnes) |
| 0009 | `supabase/migrations/0009_devis.sql` | devis + agenda (rendez-vous) |
| 0010 | `supabase/migrations/0010_backups.sql` | bucket privé `backups` |

> Si 0008 renvoie une erreur « ALTER TYPE … transaction » → ignore, il n'y a pas
> d'`ALTER TYPE` dans 0008. (C'était le cas de 0003.)

## 2. Re-déployer 1 fonction Edge (Supabase → Edge Functions)

- **`send-status-email`** → Edit → remplacer par la version GitHub
  (`supabase/functions/send-status-email/index.ts`) → Deploy.
  *(elle lit maintenant l'adresse du point de retrait + les liens avis/site)*

## 3. Email d'avis automatique (optionnel, quand tu veux)

1. Déployer la nouvelle fonction **`send-review-emails`**
   (`supabase/functions/send-review-emails/index.ts`).
2. Edge Functions → Secrets → ajouter `CRON_SECRET` = une phrase au hasard.
3. Suivre les instructions en bas de `0008_avis_relance.sql` pour planifier (pg_cron).
4. Réglages → Entreprise → remplir « Lien avis Google » et « Site web ».

## 4. Sauvegarde automatique hebdomadaire (optionnel)

1. GitHub → dépôt `atatex-app` → Settings → Secrets and variables → Actions →
   ajouter `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` (Supabase → Project Settings →
   API → `service_role` — **clé secrète, ne la mets nulle part ailleurs**).
2. GitHub → onglet Actions → « Sauvegarde hebdomadaire » → Run workflow (test).
3. Ensuite elle tourne chaque lundi. Les fichiers apparaissent dans
   Réglages → Sauvegardes.

## 5. Vérifs rapides dans l'app

- Réglages → Entreprise : TVA, IBAN, adresse (pour factures/UBL).
- Réglages → Points de retrait : adresses complètes.
- Comptabilité : nouvel onglet (admin).
- Agenda : nouvel onglet.
- Stock : produits archivés masqués ; fiche produit → section Rouleaux.
- Commande : recherche produit, choix du rouleau, champ hauteur, case « devis »,
  boutons acompte 30/40/50 %.
