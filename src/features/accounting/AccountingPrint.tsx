import { PrintSheet } from '@/components/PrintSheet';
import { Logo } from '@/components/Logo';
import { eur, num } from '@/lib/money';
import { fmtDate } from '@/lib/format';
import type { Company } from '@/types';
import type { AccountingReport } from './accounting';

export function AccountingPrint({
  report,
  company,
  onClose,
}: {
  report: AccountingReport;
  company: Company | null;
  onClose: () => void;
}) {
  const r = report;
  return (
    <PrintSheet
      docTitle={`Rapport ${r.period.label} — ${company?.name || 'ATA-TEX'}`}
      onClose={onClose}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="ps-brand">
          <Logo size={40} className="ps-logo" />
          <div>
            <div className="ps-title">{company?.name || 'ATA-TEX'}</div>
            {company?.vat && <div className="ps-soft" style={{ fontSize: 12 }}>TVA {company.vat}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>Rapport comptable</h1>
          <div className="ps-soft">{r.period.label}</div>
          <div className="ps-soft" style={{ fontSize: 11 }}>
            du {fmtDate(r.period.start)} au {fmtDate(r.period.end)}
          </div>
        </div>
      </header>

      <h2 style={{ fontSize: 14, margin: '26px 0 8px' }}>Synthèse</h2>
      <div style={{ maxWidth: 420 }}>
        <KV label="Ventes TTC" v={eur(r.salesTTC)} />
        <KV label="Ventes HT" v={eur(r.salesHT)} />
        <KV label="TVA collectée" v={eur(r.vatCollected)} />
        <KV label="Dépenses TTC" v={eur(r.expensesTTC)} />
        <KV label="Dépenses HT" v={eur(r.expensesHT)} />
        <KV label="TVA déductible" v={eur(r.vatDeductible)} />
        <div className="ps-kv big">
          <span>TVA à reverser</span>
          <span>{eur(r.vatToPay)}</span>
        </div>
        <div className="ps-kv big">
          <span>Résultat brut (HT)</span>
          <span>{eur(r.grossResult)}</span>
        </div>
      </div>
      <p className="ps-soft" style={{ fontSize: 11, marginTop: 6 }}>
        Résultat brut = ventes HT − dépenses HT. Hors salaires, amortissements et
        cotisations sociales. Document d'aide, à valider avec votre comptable.
      </p>

      <h2 style={{ fontSize: 14, margin: '24px 0 8px' }}>Journal des ventes ({r.sales.length})</h2>
      <table className="ps-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Pièce</th>
            <th>Client</th>
            <th className="r">HT</th>
            <th className="r">TVA</th>
            <th className="r">TTC</th>
          </tr>
        </thead>
        <tbody>
          {r.sales.map((s) => (
            <tr key={s.order.id}>
              <td>{fmtDate(s.order.order_date)}</td>
              <td>{s.ref}</td>
              <td>{s.order.client?.name ?? '—'}</td>
              <td className="r">{eur(s.ht)}</td>
              <td className="r">{eur(s.tva)}</td>
              <td className="r">{eur(s.ttc)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="r">{eur(r.salesHT)}</td>
            <td className="r">{eur(r.vatCollected)}</td>
            <td className="r">{eur(r.salesTTC)}</td>
          </tr>
        </tfoot>
      </table>

      <h2 style={{ fontSize: 14, margin: '24px 0 8px' }}>Dépenses ({r.expenses.length})</h2>
      <table className="ps-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Catégorie</th>
            <th className="r">HT</th>
            <th className="r">TVA déd.</th>
            <th className="r">TTC</th>
          </tr>
        </thead>
        <tbody>
          {r.expenses.map((e) => (
            <tr key={e.expense.id}>
              <td>{fmtDate(e.expense.expense_date)}</td>
              <td>{e.expense.supplier || '—'}</td>
              <td>{e.expense.description || '—'}</td>
              <td className="r">{eur(e.ht)}</td>
              <td className="r">{eur(e.tvaDeductible)}</td>
              <td className="r">{eur(e.expense.amount_ttc)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="r">{eur(r.expensesHT)}</td>
            <td className="r">{eur(r.vatDeductible)}</td>
            <td className="r">{eur(r.expensesTTC)}</td>
          </tr>
        </tfoot>
      </table>

      <h2 style={{ fontSize: 14, margin: '24px 0 8px' }}>Dépenses par catégorie</h2>
      <table className="ps-table">
        <tbody>
          {r.byCategory.map((c) => (
            <tr key={c.label}>
              <td>{c.label}</td>
              <td className="r">{eur(c.ht)} HT</td>
              <td className="r">{eur(c.ttc)} TTC</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ps-soft" style={{ fontSize: 11, marginTop: 20 }}>
        Ventes datées selon la date de commande. TVA belge {num(r.vatRate)} %.
      </p>
    </PrintSheet>
  );
}

function KV({ label, v }: { label: string; v: string }) {
  return (
    <div className="ps-kv">
      <span className="ps-soft">{label}</span>
      <span className="r">{v}</span>
    </div>
  );
}
