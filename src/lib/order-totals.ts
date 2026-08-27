import { round2, roundCash } from './money';
import type { DiscountKind, OrderItem } from '@/types';

export interface OrderTotalsInput {
  items: Pick<OrderItem, 'line_total'>[];
  discountType: DiscountKind;
  discountValue: number;
  roundTotal: boolean;
  depositAmount: number;
  vatRate: number;
}

export interface OrderTotals {
  /** somme des lignes, hors TVA, avant remise */
  subtotalHT: number;
  /** montant de la remise (toujours ≥ 0), appliquée sur le HT */
  discountAmount: number;
  /** HT après remise */
  netHT: number;
  /** TVA sur le HT net */
  tva: number;
  /** TTC avant arrondi caisse */
  ttc: number;
  /** ajustement d'arrondi caisse (peut être négatif) */
  roundingDelta: number;
  /** montant réellement dû par le client */
  totalDue: number;
  /** acompte déjà versé */
  deposit: number;
  /** solde restant à payer */
  balanceDue: number;
  vatRate: number;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const { items, discountType, discountValue, roundTotal, depositAmount, vatRate } = input;

  const subtotalHT = round2(items.reduce((s, it) => s + (Number(it.line_total) || 0), 0));

  let discountAmount = 0;
  if (discountType === 'montant') {
    discountAmount = Math.min(Math.max(Number(discountValue) || 0, 0), subtotalHT);
  } else if (discountType === 'pourcent') {
    const pct = Math.min(Math.max(Number(discountValue) || 0, 0), 100);
    discountAmount = round2((subtotalHT * pct) / 100);
  }

  const netHT = round2(subtotalHT - discountAmount);
  const tva = round2((netHT * (Number(vatRate) || 0)) / 100);
  const ttc = round2(netHT + tva);

  const totalDue = roundTotal ? roundCash(ttc) : ttc;
  const roundingDelta = round2(totalDue - ttc);

  const deposit = Math.max(Number(depositAmount) || 0, 0);
  const balanceDue = round2(totalDue - deposit);

  return {
    subtotalHT,
    discountAmount,
    netHT,
    tva,
    ttc,
    roundingDelta,
    totalDue,
    deposit,
    balanceDue,
    vatRate: Number(vatRate) || 0,
  };
}
