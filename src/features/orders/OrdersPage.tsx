import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useData } from '@/data/DataProvider';
import { useOrders, fetchOrder } from '@/data/useOrders';
import { eur } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { fmtDate, statusLabel, STATUS_ORDER, STATUS_LABEL } from '@/lib/format';
import type { OrderStatus, OrderWithRelations } from '@/types';
import { OrderEditor } from './OrderEditor';
import { OrderDetail } from './OrderDetail';

export function OrdersPage() {
  const { orders, loading, reload } = useOrders();
  const { company } = useData();
  const vatRate = company?.vat_rate ?? 21;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [editing, setEditing] = useState<OrderWithRelations | null | 'new'>(null);
  const [viewing, setViewing] = useState<OrderWithRelations | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.client?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const current = viewing ? orders.find((o) => o.id === viewing.id) ?? viewing : null;

  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle={`${orders.length} commande${orders.length > 1 ? 's' : ''}`}
        action={
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Nouvelle commande
          </button>
        }
      />

      <Panel>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <SearchInput value={search} onChange={setSearch} placeholder="Client ou n° de commande…" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={'btn btn--sm' + (statusFilter === 'all' ? ' btn--primary' : '')}
              onClick={() => setStatusFilter('all')}
            >
              Toutes
            </button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={'btn btn--sm' + (statusFilter === s ? ' btn--primary' : '')}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <EmptyState message="Chargement…" />
        ) : filtered.length === 0 ? (
          <EmptyState message={search || statusFilter !== 'all' ? 'Aucune commande ne correspond.' : 'Aucune commande. Créez la première.'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                  <th style={{ textAlign: 'right' }}>Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const t = computeOrderTotals({
                    items: o.items,
                    discountType: o.discount_type,
                    discountValue: o.discount_value,
                    roundTotal: o.round_total,
                    depositAmount: o.deposit_amount,
                    vatRate,
                  });
                  const paid = t.balanceDue <= 0;
                  return (
                    <tr key={o.id} className="clickable" onClick={() => setViewing(o)}>
                      <td className="mono">{o.order_number}</td>
                      <td>{o.client?.name ?? 'Client supprimé'}</td>
                      <td>{fmtDate(o.order_date)}</td>
                      <td>
                        <span className={`badge badge--${o.status}`}>
                          {statusLabel(o.status, o.fulfillment)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge--${paid ? 'paid' : t.deposit > 0 ? 'partial' : 'unpaid'}`}>
                          {paid ? 'Payée' : t.deposit > 0 ? 'Acompte' : 'Impayée'}
                        </span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {eur(t.totalDue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <OrderEditor
          existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (id) => {
            setEditing(null);
            await reload();
            const o = await fetchOrder(id);
            if (o) setViewing(o);
          }}
        />
      )}

      {current && !editing && (
        <OrderDetail
          order={current}
          onEdit={() => {
            setEditing(current);
          }}
          onClose={() => setViewing(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}
