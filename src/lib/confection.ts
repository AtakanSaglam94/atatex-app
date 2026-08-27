/**
 * Moteur de calcul de la confection sur mesure — ATA-TEX
 * ------------------------------------------------------
 * L'utilisateur saisit UNIQUEMENT la largeur souhaitée (en mètres) et choisit
 * un type de confection. Le métrage de tissu à commander et le prix se déduisent :
 *
 *   m (métrage à commander) = largeur × type.facteur + type.marge_fixe
 *   frais                   = catégorie "tenture" ? type.frais_tenture
 *                                                 : type.frais_rideau_voilage
 *   prix_total              = (prix_tissu_au_metre + frais) × m
 *
 * Les types de confection ne sont PAS codés en dur : ce sont des enregistrements
 * de la table `confection_types`, modifiables par l'administrateur.
 */

import type { ConfectionCategory, ConfectionType } from '@/types';

export type { ConfectionCategory, ConfectionType };

/** Champs strictement nécessaires au calcul (sous-ensemble de ConfectionType). */
export type ConfectionRule = Pick<
  ConfectionType,
  | 'nom'
  | 'facteur'
  | 'marge_fixe'
  | 'frais_rideau_voilage'
  | 'frais_tenture'
  | 'frais_store'
  | 'largeur_min'
  | 'largeur_max'
>;

export interface ConfectionInput {
  /** largeur souhaitée en mètres — seule saisie de l'utilisateur */
  largeur: number;
  /** prix du tissu au mètre (champ `prix` du produit), en € */
  prixTissuAuMetre: number;
  /** catégorie de confection du produit — choisit la colonne de frais */
  categorie: ConfectionCategory;
  /** type de confection choisi (enregistrement de `confection_types`) */
  type: ConfectionRule;
}

export interface ConfectionResult {
  /** métrage de tissu à commander, arrondi à 2 décimales (m) */
  metrage: number;
  /** frais de confection retenus selon la catégorie du produit (€/m) */
  fraisConfection: number;
  /** prix du tissu au mètre (€/m) */
  prixTissu: number;
  /** prix au mètre « tout compris » = tissu + confection (€/m) */
  prixAuMetreTotal: number;
  /** prix total de la ligne, arrondi à 2 décimales (€, hors TVA) */
  prixTotal: number;
}

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Frais de confection (€/m) applicable selon la catégorie du produit. */
export function fraisPourCategorie(
  type: Pick<ConfectionRule, 'frais_rideau_voilage' | 'frais_tenture' | 'frais_store'>,
  categorie: ConfectionCategory,
): number {
  switch (categorie) {
    case 'tenture':
      return type.frais_tenture;
    case 'store':
      return type.frais_store;
    default:
      return type.frais_rideau_voilage;
  }
}

export interface LargeurLimits {
  min: number | null;
  max: number | null;
}

/**
 * Limites de largeur effectives, par ordre de priorité décroissante :
 *   - produit (surcharge fine, ex. toile store voilage vs tenture)
 *   - catégorie de produit
 *   - type de confection
 */
export function largeurLimits(
  type: Pick<ConfectionRule, 'largeur_min' | 'largeur_max'> | null,
  categoryLargeurMax: number | null | undefined,
  productLimits?: { largeur_min: number | null; largeur_max: number | null } | null,
): LargeurLimits {
  return {
    min: productLimits?.largeur_min ?? type?.largeur_min ?? null,
    max: productLimits?.largeur_max ?? categoryLargeurMax ?? type?.largeur_max ?? null,
  };
}

/** Vérifie la largeur contre les limites. Renvoie un message d'erreur, ou null. */
export function validerLargeur(largeur: number, limits: LargeurLimits): string | null {
  if (!largeur || largeur <= 0) return 'Saisissez la largeur souhaitée (m).';
  if (limits.min != null && largeur < limits.min)
    return `Largeur minimale : ${limits.min} m.`;
  if (limits.max != null && largeur > limits.max)
    return `Largeur maximale pour ce produit : ${limits.max} m.`;
  return null;
}

/**
 * Calcule le métrage à commander et le prix total d'une ligne de confection
 * sur mesure. Le prix total est calculé à partir du métrage arrondi à 2
 * décimales, pour que la facture reste cohérente (m affiché × prix/m = total).
 */
export function calculerConfection(input: ConfectionInput): ConfectionResult {
  const largeur = Number(input.largeur) || 0;
  const prixTissu = Number(input.prixTissuAuMetre) || 0;
  const { type, categorie } = input;

  const metrage = round2(largeur * type.facteur + type.marge_fixe);
  const fraisConfection = fraisPourCategorie(type, categorie);
  const prixAuMetreTotal = round2(prixTissu + fraisConfection);
  const prixTotal = round2((prixTissu + fraisConfection) * metrage);

  return { metrage, fraisConfection, prixTissu, prixAuMetreTotal, prixTotal };
}

/**
 * Données de départ pré-remplies dans `confection_types`.
 * À valider avec les exemples de test avant mise en production.
 */
export const CONFECTION_TYPES_SEED: ConfectionRule[] = [
  { nom: 'Froncé',   facteur: 2,   marge_fixe: 0.2, frais_rideau_voilage: 4,  frais_tenture: 5,  frais_store: 0,   largeur_min: null, largeur_max: null },
  { nom: 'Plié',     facteur: 3,   marge_fixe: 0.2, frais_rideau_voilage: 4,  frais_tenture: 5,  frais_store: 0,   largeur_min: null, largeur_max: null },
  { nom: 'Plis',     facteur: 2.5, marge_fixe: 0.2, frais_rideau_voilage: 4,  frais_tenture: 5,  frais_store: 0,   largeur_min: null, largeur_max: null },
  { nom: 'Wave 6cm', facteur: 2.8, marge_fixe: 0.2, frais_rideau_voilage: 10, frais_tenture: 10, frais_store: 0,   largeur_min: null, largeur_max: null },
  { nom: 'Wave 8cm', facteur: 2.2, marge_fixe: 0.2, frais_rideau_voilage: 10, frais_tenture: 10, frais_store: 0,   largeur_min: null, largeur_max: null },
  { nom: 'Store',    facteur: 1,   marge_fixe: 0.2, frais_rideau_voilage: 0,  frais_tenture: 0,  frais_store: 120, largeur_min: 0.5,  largeur_max: 3 },
];

export const CONFECTION_CATEGORY_LABELS: Record<ConfectionCategory, string> = {
  rideau_voilage: 'Rideau / Voilage',
  tenture: 'Tenture',
  store: 'Store',
};
