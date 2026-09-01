import { computeOrderTotals } from '@/lib/order-totals';
import { round2 } from '@/lib/money';
import { inPeriod, type Period } from '@/lib/period';
import type { Expense, ExpenseCategory, OrderWithRelations } from '@/types';

export interface SaleRow {
  order: OrderWithRelations;
  ref: string;
  ttc: number;
  ht: number;
  tva: number;
}

export interface ExpenseComputed {
  expense: Expense;
  ht: number;
  tva: number;
  tvaDeductible: number;
}

export interface CategoryLine {
  label: string;
  ht: number;
  ttc: number;
}

export interface AccountingReport {
  period: Period;
  vatRate: number;

  sales: SaleRow[];
  salesTTC: number;
  salesHT: number;
  vatCollected: number;

  expenses: ExpenseComputed[];
  expensesTTC: number;
  expensesHT: number;
  vatDeductible: number;

  /** TVA à reverser à l'État (peut être négatif = crédit TVA) */
  vatToPay: number;
  /** résultat brut = ventes HT − dépenses HT (hors salaires, amortissements) */
  grossResult: number;

  cogsHT: number; // achats marchandises / tissus + sous-traitance
  byCategory: CategoryLine[];
  byPayment: { label: string; ttc: number }[];
}

const COGS_CATEGORIES = ['Achat marchandises / tissus', 'Sous-traitance / confection externe'];
const PAYMENT_LABEL: Record<string, string> = {
  especes: 'Espèces',
  bancontact: 'Bancontact',
  virement: 'Virement',
  carte: 'Carte',
  autre: 'Autre',
};

export function computeExpense(e: Expense): ExpenseComputed {
  const ht = round2(e.amount_ttc / (1 + (Number(e.vat_rate) || 0) / 100));
  const tva = round2(e.amount_ttc - ht);
  const tvaDeductible = round2((tva * (Number(e.vat_deductible_pct) || 0)) / 100);
  return { expense: e, ht, tva, tvaDeductible };
}

export function computeAccounting(
  period: Period,
  orders: OrderWithRelations[],
  expenses: Expense[],
  categories: ExpenseCategory[],
  vatRate: number,
): AccountingReport {
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const sales: SaleRow[] = orders
    .filter((o) => o.status !== 'annule' && !o.is_quote && inPeriod(o.order_date, period))
    .map((o) => {
      const t = computeOrderTotals({
        items: o.items,
        discountType: o.discount_type,
        discountValue: o.discount_value,
        roundTotal: o.round_total,
        depositAmount: o.deposit_amount,
        shippingFee: o.shipping_fee,
        vatRate,
      });
      return {
        order: o,
        ref: o.invoice_number ?? o.order_number,
        ttc: t.totalDue,
        ht: t.totalHT,
        tva: t.tva,
      };
    })
    .sort((a, b) => a.order.order_date.localeCompare(b.order.order_date));

  const salesTTC = round2(sales.reduce((s, r) => s + r.ttc, 0));
  const salesHT = round2(sales.reduce((s, r) => s + r.ht, 0));
  const vatCollected = round2(sales.reduce((s, r) => s + r.tva, 0));

  const exp: ExpenseComputed[] = expenses
    .filter((e) => inPeriod(e.expense_date, period))
    .map(computeExpense)
    .sort((a, b) => a.expense.expense_date.localeCompare(b.expense.expense_date));

  const expensesTTC = round2(exp.reduce((s, e) => s + e.expense.amount_ttc, 0));
  const expensesHT = round2(exp.reduce((s, e) => s + e.ht, 0));
  const vatDeductible = round2(exp.reduce((s, e) => s + e.tvaDeductible, 0));

  const catAgg = new Map<string, { ht: number; ttc: number }>();
  let cogsHT = 0;
  for (const e of exp) {
    const name = (e.expense.category_id && catName.get(e.expense.category_id)) || 'Sans catégorie';
    const cur = catAgg.get(name) ?? { ht: 0, ttc: 0 };
    cur.ht += e.ht;
    cur.ttc += e.expense.amount_ttc;
    catAgg.set(name, cur);
    if (COGS_CATEGORIES.includes(name)) cogsHT += e.ht;
  }

  const payAgg = new Map<string, number>();
  for (const e of exp) {
    payAgg.set(e.expense.payment_method, (payAgg.get(e.expense.payment_method) ?? 0) + e.expense.amount_ttc);
  }

  return {
    period,
    vatRate,
    sales,
    salesTTC,
    salesHT,
    vatCollected,
    expenses: exp,
    expensesTTC,
    expensesHT,
    vatDeductible,
    vatToPay: round2(vatCollected - vatDeductible),
    grossResult: round2(salesHT - expensesHT),
    cogsHT: round2(cogsHT),
    byCategory: [...catAgg.entries()]
      .map(([label, v]) => ({ label, ht: round2(v.ht), ttc: round2(v.ttc) }))
      .sort((a, b) => b.ttc - a.ttc),
    byPayment: [...payAgg.entries()]
      .map(([k, ttc]) => ({ label: PAYMENT_LABEL[k] ?? k, ttc: round2(ttc) }))
      .sort((a, b) => b.ttc - a.ttc),
  };
}
