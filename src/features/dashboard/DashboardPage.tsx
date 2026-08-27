import { useMemo } from 'react';
import { PageHeader, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/auth/AuthProvider';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { eur } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { fmtDate, statusLabel } from '@/lib/format';

export function DashboardPage() {
  const { isAdmin, profile } = useAuth();
  const { products, company } = useData();
  const { orders } = useOrders();
  const vatRate = company?.vat_rate ?? 21;

  const stats = useMemo(() => {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const yyyy = String(now.getFullYear());
    let caMonthHT = 0;
    let caYearHT = 0;
    let unpaid = 0;
    let inProgress = 0;

    for (const o of orders) {
      const t = computeOrderTotals({
        items: o.items,
        discountType: o.discount_type,
        discountValue: o.discount_value,
        roundTotal: o.round_total,
        depositAmount: o.deposit_amount,
        vatRate,
      });
      if (o.order_date.startsWith(ym)) caMonthHT += t.netHT;
      if (o.order_date.startsWith(yyyy)) caYearHT += t.netHT;
      if (t.balanceDue > 0) unpaid += 1;
      if (o.status === 'recue' || o.status === 'fabrication') inProgress += 1;
    }
    return { caMonthHT, caYearHT, unpaid, inProgress };
  }, [orders, vatRate]);

  const lowStock = products.filter((p) => p.active && p.stock <= p.low_stock_at);
  const recent = orders.slice(0, 6);

  return (
    <>
      <PageHeader title={`Bonjour ${profile?.full_name?.split(' ')[0] || ''}`.trim()} subtitle="Vue d'ensemble de l'activité" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        <Stat label="Commandes en cours" value={String(stats.inProgress)} hint="reçues ou en fabrication" />
        <Stat label="À encaisser" value={String(stats.unpaid)} hint="commandes avec solde dû" tone={stats.unpaid ? 'warn' : undefined} />
        <Stat label="Stock faible" value={String(lowStock.length)} hint="produits sous le seuil" tone={lowStock.length ? 'danger' : undefined} />
        {isAdmin ? (
          <>
            <Stat label="CA du mois (HT)" value={eur(stats.caMonthHT)} hint="commandes du mois" tone="accent" />
            <Stat label="CA de l'année (HT)" value={eur(stats.caYearHT)} hint={String(new Date().getFullYear())} tone="accent" />
          </>
        ) : null}
      </div>

      <Panel title="Commandes récentes">
        {recent.length === 0 ? (
          <EmptyState message="Aucune commande pour le moment." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.order_number}</td>
                    <td>{o.client?.name ?? '—'}</td>
                    <td>{fmtDate(o.order_date)}</td>
                    <td>
                      <span className={`badge badge--${o.status}`}>
                        {statusLabel(o.status, o.fulfillment)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {lowStock.length > 0 && (
        <Panel title="Alertes de stock">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Référence</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Seuil</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono">{p.sku}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span className="badge badge--low">{p.stock}</span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {p.low_stock_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!isAdmin && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="settings" size={14} /> Le chiffre d'affaires n'est visible que par les administrateurs.
        </p>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'accent' | 'warn' | 'danger';
}) {
  const bar =
    tone === 'accent'
      ? 'var(--accent)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'danger'
          ? 'var(--danger)'
          : 'var(--thread)';
  return (
    <div className="card" style={{ padding: '15px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: bar }} />
      <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{hint}</div>
    </div>
  );
}
