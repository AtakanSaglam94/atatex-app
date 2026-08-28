import { useMemo } from 'react';
import { PageHeader, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/auth/AuthProvider';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { eur, num } from '@/lib/money';
import { fmtDate, statusLabel } from '@/lib/format';
import { computeDashboard, type Bar } from './metrics';

export function DashboardPage() {
  const { isAdmin, profile } = useAuth();
  const { products, clients, pickupPoints, confectionTypes, company } = useData();
  const { orders } = useOrders();
  const vatRate = company?.vat_rate ?? 21;

  const m = useMemo(
    () => computeDashboard(orders, products, clients, pickupPoints, confectionTypes, vatRate),
    [orders, products, clients, pickupPoints, confectionTypes, vatRate],
  );

  const lowStock = products.filter((p) => p.active && p.stock <= p.low_stock_at);
  const recent = orders.slice(0, 6);
  const monthLabel = new Date().toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        title={`Bonjour ${profile?.full_name?.split(' ')[0] || ''}`.trim()}
        subtitle={isAdmin ? `Pilotage — ${monthLabel}` : "Vue d'ensemble de l'activité"}
      />

      {/* ---- Opérations : visible par tout le monde ---- */}
      <div className="dash-grid">
        <Stat label="Commandes en cours" value={String(m.ordersInProgress)} hint="reçues ou en fabrication" />
        <Stat label="Prêtes à remettre" value={String(m.statusCounts.pret)} hint="en attente de retrait / livraison" tone={m.statusCounts.pret ? 'accent' : undefined} />
        <Stat label="Stock faible" value={String(m.lowStockCount)} hint="produits sous le seuil" tone={m.lowStockCount ? 'danger' : undefined} />
        {isAdmin && (
          <>
            <Stat
              label="Chiffre d'affaires du mois (HT)"
              value={eur(m.caMonthHT)}
              hint={
                m.caMonthEvolutionPct == null
                  ? `${m.nbOrdersMonth} commande${m.nbOrdersMonth > 1 ? 's' : ''}`
                  : `${m.caMonthEvolutionPct >= 0 ? '▲' : '▼'} ${num(Math.abs(m.caMonthEvolutionPct))} % vs mois précédent`
              }
              tone="accent"
            />
            <Stat label="CA de l'année (HT)" value={eur(m.caYearHT)} hint={String(new Date().getFullYear())} tone="accent" />
            <Stat label="Panier moyen" value={eur(m.panierMoyen)} hint="ce mois" />
          </>
        )}
      </div>

      {isAdmin && (
        <>
          {/* ---- Trésorerie ---- */}
          <h3 style={{ fontSize: 15, margin: '10px 0 10px' }}>Trésorerie & encaissements</h3>
          <div className="dash-grid">
            <Stat label="Reste à encaisser" value={eur(m.encours)} hint="soldes clients dûs, toutes commandes" tone={m.encours ? 'warn' : undefined} />
            <Stat label="Acomptes encaissés" value={eur(m.acomptesMonth)} hint="ce mois" />
            <Stat
              label="Virements à vérifier"
              value={m.bankToCheckCount ? `${m.bankToCheckCount} · ${eur(m.bankToCheckAmount)}` : '0'}
              hint="à pointer sur le compte bancaire"
              tone={m.bankToCheckCount ? 'warn' : undefined}
            />
            <Stat label="TVA à provisionner" value={eur(m.tvaMonth)} hint="collectée ce mois" />
            <Stat
              label="Marge brute du mois"
              value={m.marginPct == null ? '—' : eur(m.marginMonth)}
              hint={
                m.marginPct == null
                  ? 'renseignez le prix de revient des produits'
                  : `${num(m.marginPct)} % du CA`
              }
              tone={m.marginPct == null ? undefined : 'accent'}
            />
            <Stat
              label="Valeur du stock"
              value={eur(m.stockValueSale)}
              hint={m.hasCostData ? `${eur(m.stockValueCost)} au prix de revient` : 'au prix de vente'}
            />
          </div>

          {/* ---- Opérations détaillées ---- */}
          <div className="dash-2col">
            <Panel title="Suivi de production" padded>
              <Funnel counts={m.statusCounts} />
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-soft)' }}>
                Délai moyen de fabrication :{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  {m.fabricationDelayDays == null ? '—' : `${num(m.fabricationDelayDays)} j`}
                </strong>{' '}
                <span style={{ color: 'var(--ink-faint)' }}>(commande → prêt, 90 derniers jours)</span>
              </div>
            </Panel>

            <Panel title={`CA par point de retrait — ${monthLabel}`} padded>
              <BarList bars={m.byPickup} empty="Aucune commande ce mois." />
            </Panel>

            <Panel title={`CA par type de confection — ${monthLabel}`} padded>
              <BarList bars={m.byConfectionType} empty="Aucune confection ce mois." />
            </Panel>

            <Panel title="Top clients — année" padded>
              <BarList bars={m.topClients} empty="Aucune commande cette année." />
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
                {m.newClientsMonth} nouveau{m.newClientsMonth > 1 ? 'x' : ''} client
                {m.newClientsMonth > 1 ? 's' : ''} ce mois.
              </div>
            </Panel>
          </div>
        </>
      )}

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
          <Icon name="settings" size={14} /> Le chiffre d'affaires et la rentabilité ne sont visibles que par les administrateurs.
        </p>
      )}

      <style>{dashCss}</style>
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
    tone === 'accent' ? 'var(--accent)'
    : tone === 'warn' ? 'var(--warn)'
    : tone === 'danger' ? 'var(--danger)'
    : 'var(--thread)';
  return (
    <div className="card dash-stat">
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: bar }} />
      <div className="dash-stat__label">{label}</div>
      <div className="dash-stat__value">{value}</div>
      <div className="dash-stat__hint">{hint}</div>
    </div>
  );
}

function Funnel({ counts }: { counts: { recue: number; fabrication: number; pret: number } }) {
  const steps: [string, number, string][] = [
    ['Reçues', counts.recue, 'var(--warn)'],
    ['En fabrication', counts.fabrication, 'var(--info)'],
    ['Prêtes', counts.pret, 'var(--accent)'],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map(([label, n, color]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 32px', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{label}</span>
          <span style={{ height: 20, background: 'var(--surface-sunken)', borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${(n / max) * 100}%`, background: color, minWidth: n ? 3 : 0 }} />
          </span>
          <span className="mono" style={{ textAlign: 'right', fontSize: 13 }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

function BarList({ bars, empty }: { bars: Bar[]; empty: string }) {
  if (bars.length === 0) return <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{empty}</div>;
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12.5, marginBottom: 3 }}>{b.label}</div>
            <span style={{ display: 'block', height: 8, background: 'var(--surface-sunken)', borderRadius: 999, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${(b.value / max) * 100}%`, background: 'var(--accent)' }} />
            </span>
          </div>
          <span className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{eur(b.value)}</span>
        </div>
      ))}
    </div>
  );
}

const dashCss = `
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 18px; }
.dash-stat { padding: 15px 16px; position: relative; overflow: hidden; }
.dash-stat__label { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
.dash-stat__value { font-family: var(--font-display); font-size: 23px; font-weight: 600; margin-top: 4px; }
.dash-stat__hint { font-size: 11.5px; color: var(--ink-faint); margin-top: 3px; }
.dash-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
@media (max-width: 780px) { .dash-2col { grid-template-columns: 1fr; } }
`;
