# ATA-TEX — application de gestion

Commerce de tissus, voilages, rideaux, tentures et stores (Bruxelles).
Gestion des commandes, du stock, des clients, du catalogue, de la confection sur
mesure, des factures (PDF + UBL/Peppol), avec 5 comptes utilisateurs et synchro
temps réel.

- **Front-end** : React + Vite + TypeScript, PWA installable (tablette / téléphone / PC)
- **Base de données + authentification + temps réel** : Supabase (PostgreSQL)
- **Emails automatiques** : Resend, via une Edge Function Supabase
- **Hébergement** : Netlify

---

## Mise en route (à faire une fois)

### 1. Comptes à créer

| Service | Adresse | Rôle |
|---|---|---|
| GitHub | github.com | héberge le code, déclenche les déploiements |
| Supabase | supabase.com | base de données + comptes utilisateurs |
| Netlify | netlify.com | met l'application en ligne |
| Resend | resend.com | envoi des emails automatiques |

### 2. Base de données Supabase

1. Créer un projet Supabase (région **EU** — Francfort ou Paris).
2. Dans **SQL Editor**, exécuter dans l'ordre :
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql`
3. **Project Settings → API** : noter `Project URL` et `anon public key`.

### 3. Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sur Netlify, définir ces deux variables dans **Site settings → Environment variables**.

### 4. Déploiement Netlify

1. Pousser ce dépôt sur GitHub.
2. Netlify → **Add new site → Import from Git** → sélectionner le dépôt.
3. Les réglages sont déjà dans `netlify.toml` (build `npm run build`, dossier `dist`).
4. Ajouter les variables d'environnement (étape 3), puis **Deploy**.

### 5. Comptes utilisateurs (les 5 personnes)

**Option A — depuis l'application** (si l'Edge Function `admin-create-user` est déployée) :
Réglages → Utilisateurs → Nouveau compte.

**Option B — depuis Supabase** : Authentication → Users → *Add user* →
renseigner email + mot de passe, cocher *Auto Confirm User*. Puis dans
l'application (Réglages → Utilisateurs) définir le rôle.

Le **premier compte** doit être passé en `admin` manuellement :
`Table editor → profiles → modifier la ligne → role = admin`.

### 6. Emails automatiques (Edge Functions)

Prérequis : [CLI Supabase](https://supabase.com/docs/guides/cli).

```bash
supabase login
supabase link --project-ref <ref-du-projet>

# Secrets (Resend + domaine d'envoi)
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM="ATA-TEX <commande@ton-domaine.be>"

supabase functions deploy send-status-email --no-verify-jwt
supabase functions deploy admin-create-user
```

Dans Resend : ajouter le domaine `ton-domaine.be` et configurer les
enregistrements DNS (SPF / DKIM) fournis. Tant que ce n'est pas fait, les emails
partent depuis `onboarding@resend.dev` (à des fins de test uniquement).

---

## Développement local

Nécessite Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérifie les types + build de production
```

---

## Logique de confection sur mesure

Le vendeur saisit **uniquement la largeur souhaitée** (en mètres) et choisit un
**type de confection**.

```
m (métrage à commander) = largeur × type.facteur + type.marge_fixe
frais                    = produit "tenture" ? type.frais_tenture
                                             : type.frais_rideau_voilage
prix total               = (prix_tissu_au_mètre + frais) × m
```

- Les **types de confection** sont des enregistrements de la table
  `confection_types`, modifiables dans Réglages → Types de confection.
- Chaque **produit tissu** a une catégorie de confection à deux valeurs
  (`rideau_voilage` ou `tenture`) qui choisit la colonne de frais. « Store » est
  un type de confection, pas une catégorie.
- Le métrage est arrondi à 2 décimales, puis le prix est calculé sur ce métrage.

Code : `src/lib/confection.ts`. Outil de validation : `docs/calculateur-confection.html`.

---

## Structure

```
src/
  lib/            confection, totaux commande, TVA, UBL, facture PDF, Supabase
  auth/           connexion, session, rôles
  data/           chargement + temps réel (référentiels, commandes)
  components/     Layout, Modal, icônes, primitives UI
  features/       dashboard, orders, stock, clients, catalog, invoices, settings
supabase/
  migrations/     schéma SQL (RLS, séquences, triggers)
  seed.sql        données de départ
  functions/      Edge Functions (emails, création d'utilisateurs)
```

## Rôles

- **admin** : accès complet, chiffre d'affaires, Réglages (types de confection,
  catégories, services, comptes utilisateurs, modèles d'emails).
- **travailleur** : commandes, stock, clients, catalogue. Pas de chiffre
  d'affaires agrégé sur le tableau de bord.

## Paiement Bancontact (V1)

Pas d'intégration : sur la commande, le bouton **« Copier le montant »** copie le
solde à payer pour le ressaisir dans l'app Bancontact Pro / Belfius Pro qui
génère le QR code. Une génération automatique du QR sera possible plus tard avec
des identifiants marchands.
