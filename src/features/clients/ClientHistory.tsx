import { useMemo } from 'react';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { eur } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { fmtDate, statusLabel } from '@/lib/format';

export function ClientHistory({ clientId }: { clientId: string }) {
  const { company } = useData();
  const { orders } = useOrders();
  const vatRate = company?.vat_rate ?? 21;

  const rows = useMemo(() => {
    return orders
      .filter((o) => o.client_id === clientId)
      .map((o) => ({
        o,
        t: computeOrderTotals({
          items: o.items,
          discountType: o.discount_type,
          discountValue: o.discount_value,
          roundTotal: o.round_total,
          depositAmount: o.deposit_amount,
          shippingFee: o.shipping_fee,
          vatRate,
        }),
      }))
      .sort((a, b) => b.o.order_date.localeCompare(a.o.order_date));
  }, [orders, clientId, vatRate]);

  const totalSpent = rows
    .filter((r) => !r.o.is_quote && r.o.status !== 'annule')
    .reduce((s, r) => s + r.t.totalDue, 0);
  const owed = rows
    .filter((r) => !r.o.is_quote && r.o.status !== 'annule')
    .reduce((s, r) => s + Math.max(r.t.balanceDue, 0), 0);

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Aucune commande pour ce client.</div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
        {rows.length} commande{rows.length > 1 ? 's' : ''} · Total dépensé{' '}
        <strong>{eur(totalSpent)}</strong>
        {owed > 0 && (
          <>
            {' '}
            · Reste dû <strong style={{ color: 'var(--danger)' }}>{eur(owed)}</strong>
          </>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <tbody>
            {rows.slice(0, 20).map(({ o, t }) => (
              <tr key={o.id}>
                <td className="mono" style={{ fontSize: 12 }}>{o.order_number}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(o.order_date)}</td>
                <td>
                  <span
                    className={`badge badge--${o.is_quote ? 'recue' : o.status}`}
                    style={{ fontSize: 10.5 }}
                  >
                    {o.is_quote ? 'Devis' : statusLabel(o.status, o.fulfillment)}
                  </span>
                </td>
                <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                  {eur(t.totalDue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
