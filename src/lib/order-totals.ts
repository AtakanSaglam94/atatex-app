import { round2, roundCash } from './money';
import type { DiscountKind, OrderItem } from '@/types';

/**
 * L'application est en TTC : les prix produits / frais de confection / lignes
 * sont saisis et stockés TVA comprise. Le HT et la TVA sont rétro-calculés
 * (TVA belge unique de 21 %) pour la facture, l'export UBL et le comptable.
 */

export interface OrderTotalsInput {
  items: Pick<OrderItem, 'line_total'>[];
  discountType: DiscountKind;
  discountValue: number;
  roundTotal: boolean;
  depositAmount: number;
  vatRate: number;
}

export interface OrderTotals {
  /** somme des lignes, TVA comprise, avant remise */
  subtotalTTC: number;
  /** montant de la remise (≥ 0), appliquée sur le TTC */
  discountAmount: number;
  /** TTC après remise, avant arrondi caisse */
  netTTC: number;
  /** ajustement d'arrondi caisse (peut être négatif) */
  roundingDelta: number;
  /** montant total dû par le client (TTC, éventuellement arrondi) */
  totalDue: number;
  /** base hors TVA correspondant au total dû (rétro-calculée) */
  totalHT: number;
  /** TVA correspondant au total dû (rétro-calculée) */
  tva: number;
  vatRate: number;
  /** acompte déjà versé */
  deposit: number;
  /** solde restant à payer */
  balanceDue: number;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const { items, discountType, discountValue, roundTotal, depositAmount, vatRate } = input;
  const rate = Number(vatRate) || 0;

  const subtotalTTC = round2(items.reduce((s, it) => s + (Number(it.line_total) || 0), 0));

  let discountAmount = 0;
  if (discountType === 'montant') {
    discountAmount = Math.min(Math.max(Number(discountValue) || 0, 0), subtotalTTC);
  } else if (discountType === 'pourcent') {
    const pct = Math.min(Math.max(Number(discountValue) || 0, 0), 100);
    discountAmount = round2((subtotalTTC * pct) / 100);
  }

  const netTTC = round2(subtotalTTC - discountAmount);
  const totalDue = roundTotal ? roundCash(netTTC) : netTTC;
  const roundingDelta = round2(totalDue - netTTC);

  const totalHT = round2(totalDue / (1 + rate / 100));
  const tva = round2(totalDue - totalHT);

  const deposit = Math.max(Number(depositAmount) || 0, 0);
  const balanceDue = round2(totalDue - deposit);

  return {
    subtotalTTC,
    discountAmount,
    netTTC,
    roundingDelta,
    totalDue,
    totalHT,
    tva,
    vatRate: rate,
    deposit,
    balanceDue,
  };
}
