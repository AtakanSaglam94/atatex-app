import { round2 } from './money';
import type { OrderWithRelations, Product, StockRoll } from '@/types';

/** Métrage consommé par les commandes non annulées, par rouleau. */
export function rollConsumption(orders: OrderWithRelations[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of orders) {
    if (o.status === 'annule') continue;
    for (const it of o.items) {
      if (it.roll_id && it.metrage != null) {
        m.set(it.roll_id, (m.get(it.roll_id) ?? 0) + (Number(it.metrage) || 0));
      }
    }
  }
  return m;
}

/** Métrage restant d'un rouleau = initial + ajustement − consommé. */
export function rollRemaining(roll: StockRoll, consumed: Map<string, number>): number {
  return round2(roll.length_initial + roll.manual_adjustment - (consumed.get(roll.id) ?? 0));
}

/** Rouleaux actifs d'un produit, avec leur métrage restant. */
export function rollsForProduct(
  productId: string,
  rolls: StockRoll[],
  consumed: Map<string, number>,
): { roll: StockRoll; remaining: number }[] {
  return rolls
    .filter((r) => r.product_id === productId)
    .map((r) => ({ roll: r, remaining: rollRemaining(r, consumed) }))
    .sort((a, b) => a.remaining - b.remaining);
}

/**
 * Stock affiché d'un produit : somme des rouleaux s'il y en a, sinon le champ `stock`.
 */
export function displayedStock(
  product: Product,
  rolls: StockRoll[],
  consumed: Map<string, number>,
): { total: number; hasRolls: boolean } {
  const mine = rolls.filter((r) => r.product_id === product.id && r.active);
  if (mine.length === 0) return { total: product.stock, hasRolls: false };
  return {
    total: round2(mine.reduce((s, r) => s + rollRemaining(r, consumed), 0)),
    hasRolls: true,
  };
}
