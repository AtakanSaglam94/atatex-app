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
  'nom' | 'facteur' | 'marge_fixe' | 'frais_rideau_voilage' | 'frais_tenture'
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
  type: Pick<ConfectionRule, 'frais_rideau_voilage' | 'frais_tenture'>,
  categorie: ConfectionCategory,
): number {
  return categorie === 'tenture' ? type.frais_tenture : type.frais_rideau_voilage;
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
  { nom: 'Froncé',   facteur: 2,   marge_fixe: 0.2, frais_rideau_voilage: 4,   frais_tenture: 5 },
  { nom: 'Plié',     facteur: 3,   marge_fixe: 0.2, frais_rideau_voilage: 4,   frais_tenture: 5 },
  { nom: 'Wave 6cm', facteur: 2.8, marge_fixe: 0.2, frais_rideau_voilage: 10,  frais_tenture: 10 },
  { nom: 'Wave 8cm', facteur: 2.2, marge_fixe: 0.2, frais_rideau_voilage: 10,  frais_tenture: 10 },
  { nom: 'Store',    facteur: 1,   marge_fixe: 0.2, frais_rideau_voilage: 120, frais_tenture: 120 },
];

export const CONFECTION_CATEGORY_LABELS: Record<ConfectionCategory, string> = {
  rideau_voilage: 'Rideau / Voilage',
  tenture: 'Tenture',
};
