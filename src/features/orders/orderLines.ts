import { calculerConfection, largeurLimits, validerLargeur } from '@/lib/confection';
import { round2 } from '@/lib/money';
import { UNIT_LABEL } from '@/lib/format';
import type {
  ConfectionCategory,
  ConfectionType,
  OrderItem,
  Product,
  ProductCategory,
  ProductUnit,
  Service,
} from '@/types';

export interface DraftItem {
  key: string;
  kind: 'produit' | 'service' | 'libre';
  label: string;
  unit: ProductUnit | null;
  qty: number;
  unit_price: number;
  product_id: string | null;
  service_id: string | null;
  is_confection: boolean;
  confection_type_id: string | null;
  largeur: number | null;
  hauteur: number | null;
}

let seq = 0;
const key = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newProductLine(): DraftItem {
  return {
    key: key(),
    kind: 'produit',
    label: '',
    unit: 'piece',
    qty: 1,
    unit_price: 0,
    product_id: null,
    service_id: null,
    is_confection: false,
    confection_type_id: null,
    largeur: null,
    hauteur: null,
  };
}

export function newServiceLine(service: Service): DraftItem {
  return {
    key: key(),
    kind: 'service',
    label: service.name,
    unit: 'piece',
    qty: 1,
    unit_price: service.price,
    product_id: null,
    service_id: service.id,
    is_confection: false,
    confection_type_id: null,
    largeur: null,
    hauteur: null,
  };
}

export function newFreeLine(): DraftItem {
  return {
    key: key(),
    kind: 'libre',
    label: '',
    unit: null,
    qty: 1,
    unit_price: 0,
    product_id: null,
    service_id: null,
    is_confection: false,
    confection_type_id: null,
    largeur: null,
    hauteur: null,
  };
}

export function draftFromOrderItem(it: OrderItem): DraftItem {
  return {
    key: key(),
    kind: it.kind,
    label: it.label,
    unit: it.unit,
    qty: Number(it.qty),
    unit_price: Number(it.unit_price),
    product_id: it.product_id,
    service_id: it.service_id,
    is_confection: it.is_confection,
    confection_type_id: it.confection_type_id,
    largeur: it.largeur != null ? Number(it.largeur) : null,
    hauteur: it.hauteur != null ? Number(it.hauteur) : null,
  };
}

export interface ComputedLine {
  label: string;
  unit: ProductUnit | null;
  qty: number;
  unit_price: number;
  line_total: number;
  is_confection: boolean;
  confection_type_id: string | null;
  confection_type_label: string;
  confection_category: ConfectionCategory | null;
  largeur: number | null;
  facteur: number | null;
  marge_fixe: number | null;
  frais_confection: number | null;
  metrage: number | null;
  /** message d'aide pour l'UI (calcul de confection détaillé) */
  note?: string;
  error?: string;
}

/**
 * Calcule une ligne à partir du brouillon + des données de référence.
 * C'est ici que la confection sur mesure est appliquée.
 */
export function computeLine(
  d: DraftItem,
  products: Product[],
  confectionTypes: ConfectionType[],
  categories: ProductCategory[] = [],
): ComputedLine {
  if (d.kind === 'service' || d.kind === 'libre') {
    return {
      label: d.label,
      unit: d.unit,
      qty: round2(d.qty),
      unit_price: round2(d.unit_price),
      line_total: round2(d.qty * d.unit_price),
      is_confection: false,
      confection_type_id: null,
      confection_type_label: '',
      confection_category: null,
      largeur: null,
      facteur: null,
      marge_fixe: null,
      frais_confection: null,
      metrage: null,
    };
  }

  const product = products.find((p) => p.id === d.product_id) ?? null;
  const base: ComputedLine = {
    label: product?.name ?? d.label,
    unit: product?.unit ?? d.unit,
    qty: round2(d.qty),
    unit_price: round2(product?.price ?? d.unit_price),
    line_total: 0,
    is_confection: false,
    confection_type_id: null,
    confection_type_label: '',
    confection_category: null,
    largeur: null,
    facteur: null,
    marge_fixe: null,
    frais_confection: null,
    metrage: null,
  };

  if (!d.is_confection) {
    base.line_total = round2(base.qty * base.unit_price);
    if (product && product.max_qty_per_line != null && base.qty > product.max_qty_per_line) {
      base.error =
        `Maximum ${product.max_qty_per_line} ${UNIT_LABEL[product.unit]} par ligne. ` +
        `Ajoutez une deuxième ligne du même produit pour le reste.`;
    }
    return base;
  }

  // --- Confection sur mesure ---
  const type = confectionTypes.find((t) => t.id === d.confection_type_id) ?? null;

  if (!product) return { ...base, error: 'Choisissez un produit.' };
  if (product.unit !== 'm')
    return { ...base, error: 'La confection ne concerne que les tissus vendus au mètre.' };
  if (!product.confection_category)
    return {
      ...base,
      error: 'Ce produit n\'a pas de catégorie de confection (à définir dans le catalogue).',
    };
  if (!type) return { ...base, error: 'Choisissez un type de confection.' };

  const categoryLargeurMax =
    categories.find((c) => c.id === product.category_id)?.largeur_max ?? null;
  const limits = largeurLimits(type, categoryLargeurMax, product);
  const largeurError = validerLargeur(d.largeur ?? 0, limits);
  if (largeurError) return { ...base, largeur: d.largeur, error: largeurError };

  const r = calculerConfection({
    largeur: d.largeur ?? 0,
    prixTissuAuMetre: product.price,
    categorie: product.confection_category,
    type,
  });

  return {
    label: `${product.name} — ${type.nom}`,
    unit: 'm',
    qty: r.metrage,
    unit_price: r.prixAuMetreTotal,
    line_total: r.prixTotal,
    is_confection: true,
    confection_type_id: type.id,
    confection_type_label: type.nom,
    confection_category: product.confection_category,
    largeur: d.largeur,
    facteur: type.facteur,
    marge_fixe: type.marge_fixe,
    frais_confection: r.fraisConfection,
    metrage: r.metrage,
    note:
      `${d.largeur} m × ${type.facteur} + ${type.marge_fixe} m = ${r.metrage} m à commander · ` +
      `(${r.prixTissu} + ${r.fraisConfection}) €/m`,
  };
}
