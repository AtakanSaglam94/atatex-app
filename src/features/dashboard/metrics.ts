import { computeOrderTotals } from '@/lib/order-totals';
import { round2 } from '@/lib/money';
import type {
  Client,
  ConfectionType,
  OrderWithRelations,
  PickupPoint,
  Product,
} from '@/types';

export interface Bar {
  label: string;
  value: number;
}

export interface DashboardMetrics {
  hasCostData: boolean;

  caMonthHT: number;
  caMonthTTC: number;
  caPrevMonthHT: number;
  caMonthEvolutionPct: number | null;
  caYearHT: number;

  nbOrdersMonth: number;
  panierMoyen: number;

  marginMonth: number;
  marginPct: number | null;

  tvaMonth: number;

  encours: number;
  acomptesMonth: number;
  bankToCheckCount: number;
  bankToCheckAmount: number;

  statusCounts: { recue: number; fabrication: number; pret: number };
  ordersInProgress: number;
  fabricationDelayDays: number | null;

  byPickup: Bar[];
  byConfectionType: Bar[];

  stockValueSale: number;
  stockValueCost: number;
  lowStockCount: number;

  newClientsMonth: number;
  topClients: Bar[];
}

const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function computeDashboard(
  orders: OrderWithRelations[],
  products: Product[],
  clients: Client[],
  pickupPoints: PickupPoint[],
  _confectionTypes: ConfectionType[],
  vatRate: number,
  now: Date = new Date(),
): DashboardMetrics {
  const ym = ymOf(now);
  const prevYm = ymOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const yyyy = String(now.getFullYear());

  const productById = new Map(products.map((p) => [p.id, p]));
  const pickupName = new Map(pickupPoints.map((p) => [p.id, p.name]));
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? 'Client supprimé';

  let caMonthHT = 0;
  let caMonthTTC = 0;
  let caPrevMonthHT = 0;
  let caYearHT = 0;
  let nbOrdersMonth = 0;
  let cogsMonth = 0;
  let tvaMonth = 0;
  let encours = 0;
  let acomptesMonth = 0;
  let bankToCheckCount = 0;
  let bankToCheckAmount = 0;

  const statusCounts = { recue: 0, fabrication: 0, pret: 0 };
  const pickupAgg = new Map<string, number>();
  const confAgg = new Map<string, number>();
  const clientAgg = new Map<string, number>();
  const delays: number[] = [];
  const delayCutoff = new Date(now.getTime() - 90 * 864e5);

  for (const o of orders) {
    if (o.status === 'annule') continue; // annulée : exclue de tous les indicateurs

    const t = computeOrderTotals({
      items: o.items,
      discountType: o.discount_type,
      discountValue: o.discount_value,
      roundTotal: o.round_total,
      depositAmount: o.deposit_amount,
      vatRate,
    });

    const cogs = o.items.reduce((s, it) => {
      if (it.kind !== 'produit' || !it.product_id) return s;
      const cost = productById.get(it.product_id)?.cost_price ?? 0;
      return s + cost * (Number(it.qty) || 0);
    }, 0);

    const inMonth = o.order_date.startsWith(ym);
    const inPrevMonth = o.order_date.startsWith(prevYm);
    const inYear = o.order_date.startsWith(yyyy);

    if (inMonth) {
      caMonthHT += t.totalHT;
      caMonthTTC += t.totalDue;
      cogsMonth += cogs;
      tvaMonth += t.tva;
      acomptesMonth += t.deposit;
      nbOrdersMonth += 1;
      if (o.fulfillment === 'livraison') {
        pickupAgg.set('Livraison', (pickupAgg.get('Livraison') ?? 0) + t.totalHT);
      } else {
        const name = (o.pickup_point_id && pickupName.get(o.pickup_point_id)) || 'Retrait (à préciser)';
        pickupAgg.set(name, (pickupAgg.get(name) ?? 0) + t.totalHT);
      }
      for (const it of o.items) {
        if (it.is_confection && it.confection_type_label) {
          const ht = (Number(it.line_total) || 0) / (1 + vatRate / 100);
          confAgg.set(
            it.confection_type_label,
            (confAgg.get(it.confection_type_label) ?? 0) + ht,
          );
        }
      }
    }
    if (inPrevMonth) caPrevMonthHT += t.totalHT;
    if (inYear) {
      caYearHT += t.totalHT;
      clientAgg.set(o.client_id, (clientAgg.get(o.client_id) ?? 0) + t.totalHT);
    }

    if (t.balanceDue > 0) {
      encours += t.balanceDue;
      if (o.bank_transfer) {
        bankToCheckCount += 1;
        bankToCheckAmount += t.balanceDue;
      }
    }

    if (o.status === 'recue') statusCounts.recue += 1;
    else if (o.status === 'fabrication') statusCounts.fabrication += 1;
    else if (o.status === 'pret') statusCounts.pret += 1;

    if (o.ready_at && new Date(o.created_at) > delayCutoff) {
      const d = (new Date(o.ready_at).getTime() - new Date(o.created_at).getTime()) / 864e5;
      if (d >= 0 && d < 365) delays.push(d);
    }
  }

  const marginMonth = round2(caMonthHT - cogsMonth);
  const hasCostData = products.some((p) => p.cost_price > 0);
  const toBars = (m: Map<string, number>): Bar[] =>
    [...m.entries()]
      .map(([label, value]) => ({ label, value: round2(value) }))
      .sort((a, b) => b.value - a.value);

  return {
    hasCostData,
    caMonthHT: round2(caMonthHT),
    caMonthTTC: round2(caMonthTTC),
    caPrevMonthHT: round2(caPrevMonthHT),
    caMonthEvolutionPct:
      caPrevMonthHT > 0 ? round2(((caMonthHT - caPrevMonthHT) / caPrevMonthHT) * 100) : null,
    caYearHT: round2(caYearHT),
    nbOrdersMonth,
    panierMoyen: nbOrdersMonth ? round2(caMonthHT / nbOrdersMonth) : 0,
    marginMonth,
    marginPct: hasCostData && caMonthHT > 0 ? round2((marginMonth / caMonthHT) * 100) : null,
    tvaMonth: round2(tvaMonth),
    encours: round2(encours),
    acomptesMonth: round2(acomptesMonth),
    bankToCheckCount,
    bankToCheckAmount: round2(bankToCheckAmount),
    statusCounts,
    ordersInProgress: statusCounts.recue + statusCounts.fabrication,
    fabricationDelayDays: delays.length
      ? round2(delays.reduce((a, b) => a + b, 0) / delays.length)
      : null,
    byPickup: toBars(pickupAgg),
    byConfectionType: toBars(confAgg),
    stockValueSale: round2(
      products.filter((p) => p.active).reduce((s, p) => s + p.stock * p.price, 0),
    ),
    stockValueCost: round2(
      products.filter((p) => p.active).reduce((s, p) => s + p.stock * p.cost_price, 0),
    ),
    lowStockCount: products.filter((p) => p.active && p.stock <= p.low_stock_at).length,
    newClientsMonth: clients.filter((c) => (c.created_at ?? '').startsWith(ym)).length,
    topClients: toBars(
      new Map([...clientAgg.entries()].map(([id, v]) => [clientName(id), v])),
    ).slice(0, 5),
  };
}
