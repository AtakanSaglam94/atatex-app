import { useMemo, useState } from 'react';
import { PageHeader, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useExpenses } from '@/data/useExpenses';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur, num } from '@/lib/money';
import { fmtDate } from '@/lib/format';
import { downloadCSV, csvNum } from '@/lib/csv';
import { currentPeriod, shiftPeriod, type PeriodType } from '@/lib/period';
import { computeAccounting } from './accounting';
import { ExpenseEditor } from './ExpenseEditor';
import { AccountingPrint } from './AccountingPrint';
import type { Expense } from '@/types';

type Tab = 'apercu' | 'ventes' | 'depenses' | 'tva';

export function AccountingPage() {
  const { company } = useData();
  const { orders } = useOrders();
  const { expenses, categories } = useExpenses();
  const toast = useToast();
  const vatRate = company?.vat_rate ?? 21;

  const [tab, setTab] = useState<Tab>('apercu');
  const [periodType, setPeriodType] = useState<PeriodType>('quarter');
  const [period, setPeriod] = useState(() => currentPeriod('quarter'));
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [printing, setPrinting] = useState(false);

  const report = useMemo(
    () => computeAccounting(period, orders, expenses, categories, vatRate),
    [period, orders, expenses, categories, vatRate],
  );

  function changeType(t: PeriodType) {
    setPeriodType(t);
    setPeriod(currentPeriod(t));
  }

  function exportSalesCSV() {
    downloadCSV(
      `ventes-${period.label.replace(/\s/g, '-')}.csv`,
      ['Date', 'Pièce', 'Client', 'HT', 'TVA', 'TTC'],
      report.sales.map((s) => [
        s.order.order_date,
        s.ref,
        s.order.client?.name ?? '',
        csvNum(s.ht),
        csvNum(s.tva),
        csvNum(s.ttc),
      ]),
    );
  }

  function exportExpensesCSV() {
    downloadCSV(
      `depenses-${period.label.replace(/\s/g, '-')}.csv`,
      ['Date', 'Fournisseur', 'Catégorie', 'Description', 'HT', 'TVA', 'TVA déductible', 'TTC', 'Paiement'],
      report.expenses.map((e) => [
        e.expense.expense_date,
        e.expense.supplier,
        categories.find((c) => c.id === e.expense.category_id)?.name ?? '',
        e.expense.description,
        csvNum(e.ht),
        csvNum(e.tva),
        csvNum(e.tvaDeductible),
        csvNum(e.expense.amount_ttc),
        e.expense.payment_method,
      ]),
    );
  }

  async function removeExpense(e: Expense) {
    setDeleting(null);
    const { error } = await supabase.from('expenses').delete().eq('id', e.id);
    if (error) toast.error(error.message);
    else toast.ok('Dépense supprimée.');
  }

  return (
    <>
      <PageHeader
        title="Comptabilité"
        subtitle="Ventes, TVA et dépenses — aide au comptable"
        action={
          <button className="btn" onClick={() => setPrinting(true)}>
            <Icon name="invoices" size={15} /> Rapport imprimable
          </button>
        }
      />

      {/* période */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
            <button
              key={t}
              className={'btn btn--sm' + (periodType === t ? ' btn--primary' : '')}
              onClick={() => changeType(t)}
            >
              {t === 'month' ? 'Mois' : t === 'quarter' ? 'Trimestre' : 'Année'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn--sm btn--ghost" onClick={() => setPeriod(shiftPeriod(period, -1))}>
            ‹
          </button>
          <strong style={{ minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
            {period.label}
          </strong>
          <button className="btn btn--sm btn--ghost" onClick={() => setPeriod(shiftPeriod(period, 1))}>
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            ['apercu', 'Aperçu'],
            ['ventes', 'Ventes'],
            ['depenses', 'Dépenses'],
            ['tva', 'TVA'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            className={'btn btn--sm' + (tab === k ? ' btn--primary' : '')}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <Stat label="Ventes TTC" value={eur(report.salesTTC)} hint={`${report.sales.length} commande(s)`} />
            <Stat label="Ventes HT" value={eur(report.salesHT)} tone="accent" />
            <Stat label="Dépenses TTC" value={eur(report.expensesTTC)} hint={`${report.expenses.length} dépense(s)`} />
            <Stat label="Dépenses HT" value={eur(report.expensesHT)} />
            <Stat label="TVA à reverser" value={eur(report.vatToPay)} tone={report.vatToPay > 0 ? 'warn' : 'accent'} hint="collectée − déductible" />
            <Stat label="Résultat brut (HT)" value={eur(report.grossResult)} tone={report.grossResult >= 0 ? 'accent' : 'danger'} hint="ventes HT − dépenses HT" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel title="Dépenses par catégorie" padded>
              {report.byCategory.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Aucune dépense sur la période.</div>
              ) : (
                report.byCategory.map((c) => (
                  <div key={c.label} className="ps-kv" style={{ padding: '5px 0', fontSize: 13 }}>
                    <span>{c.label}</span>
                    <span className="mono">{eur(c.ttc)}</span>
                  </div>
                ))
              )}
            </Panel>
            <Panel title="Coût des marchandises" padded>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
                {eur(report.cogsHT)} <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>HT</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                Achats tissus + sous-traitance. Marge sur marchandises :{' '}
                <strong>{eur(report.salesHT - report.cogsHT)}</strong>
                {report.salesHT > 0 && ` (${num(((report.salesHT - report.cogsHT) / report.salesHT) * 100)} %)`}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'ventes' && (
        <Panel
          title={`Journal des ventes — ${period.label}`}
          action={
            <button className="btn btn--sm" onClick={exportSalesCSV}>
              <Icon name="download" size={14} /> Excel (CSV)
            </button>
          }
        >
          {report.sales.length === 0 ? (
            <EmptyState message="Aucune vente sur cette période." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pièce</th>
                    <th>Client</th>
                    <th style={{ textAlign: 'right' }}>HT</th>
                    <th style={{ textAlign: 'right' }}>TVA</th>
                    <th style={{ textAlign: 'right' }}>TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((s) => (
                    <tr key={s.order.id}>
                      <td>{fmtDate(s.order.order_date)}</td>
                      <td className="mono">{s.ref}</td>
                      <td>{s.order.client?.name ?? '—'}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(s.ht)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(s.tva)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(s.ttc)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td colSpan={3} style={{ padding: '10px 16px' }}>Total</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.salesHT)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.vatCollected)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.salesTTC)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'depenses' && (
        <Panel
          title={`Dépenses — ${period.label}`}
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn--sm" onClick={exportExpensesCSV}>
                <Icon name="download" size={14} /> CSV
              </button>
              <button className="btn btn--sm btn--primary" onClick={() => setEditing('new')}>
                <Icon name="plus" size={14} /> Dépense
              </button>
            </div>
          }
        >
          {report.expenses.length === 0 ? (
            <EmptyState message="Aucune dépense sur cette période." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fournisseur</th>
                    <th>Catégorie</th>
                    <th style={{ textAlign: 'right' }}>HT</th>
                    <th style={{ textAlign: 'right' }}>TVA déd.</th>
                    <th style={{ textAlign: 'right' }}>TTC</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((e) => (
                    <tr key={e.expense.id} className="clickable" onClick={() => setEditing(e.expense)}>
                      <td>{fmtDate(e.expense.expense_date)}</td>
                      <td>
                        {e.expense.supplier || '—'}
                        {e.expense.receipt_url && (
                          <Icon name="invoices" size={12} className="mono" />
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        {categories.find((c) => c.id === e.expense.category_id)?.name ?? '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(e.ht)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(e.tvaDeductible)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{eur(e.expense.amount_ttc)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDeleting(e.expense);
                          }}
                          aria-label="Supprimer"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td colSpan={3} style={{ padding: '10px 16px' }}>Total</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.expensesHT)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.vatDeductible)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{eur(report.expensesTTC)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'tva' && (
        <Panel title={`Récapitulatif TVA — ${period.label}`} padded>
          <div style={{ maxWidth: 460 }}>
            <div className="ps-kv" style={{ padding: '6px 0' }}>
              <span>Chiffre d'affaires HT (base imposable)</span>
              <span className="mono">{eur(report.salesHT)}</span>
            </div>
            <div className="ps-kv" style={{ padding: '6px 0' }}>
              <span>TVA collectée sur les ventes ({num(vatRate)} %)</span>
              <span className="mono">{eur(report.vatCollected)}</span>
            </div>
            <div className="ps-kv" style={{ padding: '6px 0' }}>
              <span>TVA déductible sur les achats / frais</span>
              <span className="mono">− {eur(report.vatDeductible)}</span>
            </div>
            <div
              className="ps-kv"
              style={{
                padding: '10px 0 0',
                marginTop: 6,
                borderTop: '1.5px solid var(--ink)',
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              <span>{report.vatToPay >= 0 ? 'TVA à payer à l\'État' : 'Crédit de TVA (en votre faveur)'}</span>
              <span className="mono">{eur(Math.abs(report.vatToPay))}</span>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 14 }}>
            Chiffres indicatifs pour préparer la déclaration TVA (mensuelle ou trimestrielle).
            Les ventes sont datées selon la date de commande. À faire valider par votre comptable.
          </p>
        </Panel>
      )}

      {editing && (
        <ExpenseEditor
          expense={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la dépense"
          message={`Supprimer la dépense « ${deleting.supplier || deleting.description || fmtDate(deleting.expense_date)} » ?`}
          danger
          confirmLabel="Supprimer"
          onConfirm={() => removeExpense(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
      {printing && (
        <AccountingPrint report={report} company={company} onClose={() => setPrinting(false)} />
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
  hint?: string;
  tone?: 'accent' | 'warn' | 'danger';
}) {
  const bar =
    tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warn)' : tone === 'danger' ? 'var(--danger)' : 'var(--thread)';
  return (
    <div className="card" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: bar }} />
      <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
