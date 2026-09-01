import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { eur, num } from '@/lib/money';
import { fmtDate, clientDisplayName, clientAddressText } from '@/lib/format';
import type { OrderTotals } from '@/lib/order-totals';
import type { Company, OrderWithRelations } from '@/types';

interface Props {
  order: OrderWithRelations;
  company: Company;
  totals: OrderTotals;
  invoiceNumber: string;
  onClose: () => void;
}

/**
 * Facture affichée en plein écran, imprimable (ou « Enregistrer en PDF » depuis
 * la boîte d'impression du navigateur). Fonctionne sur PC, tablette et téléphone.
 */
export function PrintableInvoice({ order, company, totals, invoiceNumber, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // le titre du document = en-tête que le navigateur imprime en marge
    const prevTitle = document.title;
    document.title = `${invoiceNumber} — ${company.name || 'ATA-TEX'}`;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.title = prevTitle;
    };
  }, [onClose, invoiceNumber, company.name]);

  const client = order.client;

  return createPortal(
    <div className="print-overlay">
      <div className="print-toolbar">
        <button className="btn btn--ghost" onClick={onClose}>
          <Icon name="x" size={16} /> Fermer
        </button>
        <button className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="invoices" size={16} /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="print-sheet">
        <header className="inv-head">
          <div>
            <div className="inv-brand">
              <Logo size={46} className="inv-logo" />
              <span className="inv-co">{company.name || 'ATA-TEX'}</span>
            </div>
            {company.address && <div>{company.address}</div>}
            {company.vat && <div>TVA {company.vat}</div>}
            {company.phone && <div>Tél. {company.phone}</div>}
            {company.email && <div>{company.email}</div>}
          </div>
          <div className="inv-meta">
            <h1>FACTURE</h1>
            <div>{invoiceNumber}</div>
            <div>Date : {fmtDate(order.order_date)}</div>
            <div>Commande : {order.order_number}</div>
          </div>
        </header>

        <section className="inv-to">
          <div className="inv-label">Facturé à</div>
          <div className="inv-client">{client ? clientDisplayName(client) : 'Client'}</div>
          {client && clientAddressText(client) && <div>{clientAddressText(client)}</div>}
          {client?.vat && <div>TVA {client.vat}</div>}
        </section>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="r">Qté</th>
              <th className="r">P.U.</th>
              <th className="r">Montant</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.label}
                  {it.is_confection && (
                    <div className="inv-sub">
                      Largeur {num(it.largeur ?? 0, 0, 2)} m
                      {it.hauteur ? ` × hauteur ${num(it.hauteur, 0, 2)} m` : ''} · {num(it.metrage ?? 0, 0, 2)} m
                      de tissu · confection {eur(it.frais_confection ?? 0)}/m
                    </div>
                  )}
                </td>
                <td className="r">
                  {num(it.qty, 0, 2)}
                  {it.unit === 'm' ? ' m' : ''}
                </td>
                <td className="r">{eur(it.unit_price)}</td>
                <td className="r">{eur(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-totals">
          <Row label="Sous-total HT" value={eur(totals.subtotalHT)} />
          {totals.discountAmount > 0 && (
            <Row label="Remise" value={`− ${eur(totals.discountAmount)}`} />
          )}
          <Row label={`TVA ${num(totals.vatRate)} %`} value={eur(totals.tva)} />
          {totals.roundingDelta !== 0 && <Row label="Arrondi" value={eur(totals.roundingDelta)} />}
          <Row label="Total à payer" value={eur(totals.totalDue)} strong />
          {totals.deposit > 0 && (
            <>
              <Row label="Acompte versé" value={`− ${eur(totals.deposit)}`} />
              <Row label="Solde restant dû" value={eur(totals.balanceDue)} strong />
            </>
          )}
        </div>

        <footer className="inv-foot">
          <div>{company.invoice_terms || 'Paiement à réception de la facture.'}</div>
          {company.iban && <div>Paiement par virement : {company.iban}</div>}
        </footer>
      </div>

      <style>{css}</style>
    </div>,
    document.body,
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={'inv-trow' + (strong ? ' strong' : '')}>
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

const css = `
.print-overlay {
  position: fixed; inset: 0; z-index: 3000; background: #6b6051;
  overflow-y: auto; padding: 24px 12px 60px;
}
.print-toolbar {
  max-width: 800px; margin: 0 auto 16px; display: flex; justify-content: space-between; gap: 10px;
}
.print-sheet {
  max-width: 800px; margin: 0 auto; background: #fff; color: #1c1712;
  padding: 40px 44px; border-radius: 4px; font-size: 13px; line-height: 1.5;
  font-family: 'Inter', system-ui, sans-serif;
}
.inv-head { display: flex; justify-content: space-between; gap: 24px; }
.inv-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.inv-logo { color: #9a5a2c; }
.inv-co { font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; color: #1c1712; }
.inv-head > div:last-child { color: #6b6051; }
.inv-meta { text-align: right; }
.inv-meta h1 { font-family: 'Fraunces', Georgia, serif; font-size: 20px; margin: 0 0 4px; }
.inv-meta div { color: #6b6051; }
.inv-to { margin: 28px 0 22px; }
.inv-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b6051; margin-bottom: 3px; }
.inv-client { font-weight: 600; }
.inv-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
.inv-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6051; padding: 7px 8px; border-bottom: 1.5px solid #cebfa4; }
.inv-table td { padding: 8px; border-bottom: 1px solid #eadfce; vertical-align: top; }
.inv-table .r { text-align: right; white-space: nowrap; }
.inv-sub { font-size: 11px; color: #877a64; margin-top: 2px; }
.inv-totals { margin-left: auto; width: 280px; }
.inv-trow { display: flex; justify-content: space-between; padding: 4px 0; color: #6b6051; }
.inv-trow.strong { color: #1c1712; font-weight: 600; font-size: 15px; border-top: 1.5px solid #1c1712; padding-top: 8px; margin-top: 4px; }
.inv-trow .mono { font-variant-numeric: tabular-nums; }
.inv-foot { margin-top: 34px; padding-top: 14px; border-top: 1px solid #eadfce; color: #6b6051; font-size: 12px; }

@media print {
  #root { display: none !important; }
  .print-overlay { position: static !important; inset: auto !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
  .print-toolbar { display: none !important; }
  .print-sheet { max-width: none; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
  @page { size: A4; margin: 16mm; }
}
`;
