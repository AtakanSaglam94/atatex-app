import { PrintSheet } from '@/components/PrintSheet';
import { Logo } from '@/components/Logo';
import { eur, num } from '@/lib/money';
import { fmtDate, clientDisplayName, clientAddressText, fulfillmentText } from '@/lib/format';
import type { OrderTotals } from '@/lib/order-totals';
import type { Company, OrderWithRelations, PickupPoint } from '@/types';

export type OrderDocKind = 'facture' | 'devis' | 'bon';

interface Props {
  order: OrderWithRelations;
  company: Company;
  totals: OrderTotals;
  docNumber: string;
  kind?: OrderDocKind;
  pickupPoint?: PickupPoint | null;
  onClose: () => void;
}

const TITLES: Record<OrderDocKind, string> = {
  facture: 'FACTURE',
  devis: 'DEVIS',
  bon: 'BON DE COMMANDE',
};

export function PrintableInvoice({
  order,
  company,
  totals,
  docNumber,
  kind = 'facture',
  pickupPoint,
  onClose,
}: Props) {
  const client = order.client;

  return (
    <PrintSheet docTitle={`${docNumber} — ${company.name || 'ATA-TEX'}`} onClose={onClose}>
      <header className="inv-head">
        <div>
          <div className="ps-brand" style={{ marginBottom: 6 }}>
            <Logo size={46} className="ps-logo" />
            <span className="inv-co">{company.name || 'ATA-TEX'}</span>
          </div>
          {company.address && <div className="ps-soft">{company.address}</div>}
          {company.vat && <div className="ps-soft">TVA {company.vat}</div>}
          {company.phone && <div className="ps-soft">Tél. {company.phone}</div>}
          {company.email && <div className="ps-soft">{company.email}</div>}
        </div>
        <div className="inv-meta">
          <h1>{TITLES[kind]}</h1>
          <div className="ps-soft">{docNumber}</div>
          <div className="ps-soft">Date : {fmtDate(order.order_date)}</div>
          {kind === 'devis' && order.quote_valid_until && (
            <div className="ps-soft">Valable jusqu'au {fmtDate(order.quote_valid_until)}</div>
          )}
          {kind !== 'devis' && <div className="ps-soft">Commande : {order.order_number}</div>}
        </div>
      </header>

      <section className="inv-to">
        <div className="inv-label">{kind === 'facture' ? 'Facturé à' : 'Client'}</div>
        <div className="inv-client">{client ? clientDisplayName(client) : 'Client'}</div>
        {client && clientAddressText(client) && <div>{clientAddressText(client)}</div>}
        {client?.vat && <div>TVA {client.vat}</div>}
        {kind !== 'devis' && (
          <div className="ps-soft" style={{ marginTop: 4 }}>
            {fulfillmentText(order.fulfillment, pickupPoint ?? null)}
          </div>
        )}
      </section>

      <table className="ps-table" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>Désignation</th>
            <th className="r">Qté</th>
            <th className="r">P.U. TTC</th>
            <th className="r">Montant TTC</th>
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
        <Row label="Sous-total TVA comprise" value={eur(totals.subtotalTTC)} />
        {totals.discountAmount > 0 && <Row label="Remise" value={`− ${eur(totals.discountAmount)}`} />}
        {totals.roundingDelta !== 0 && <Row label="Arrondi" value={eur(totals.roundingDelta)} />}
        <div className="ps-kv big">
          <span>TOTAL À PAYER (TTC)</span>
          <span>{eur(totals.totalDue)}</span>
        </div>
        <div className="inv-vatbox">
          <Row label="Base hors TVA" value={eur(totals.totalHT)} />
          <Row label={`TVA ${num(totals.vatRate)} %`} value={eur(totals.tva)} />
        </div>
        {totals.deposit > 0 && (
          <>
            <Row label="Acompte déjà versé" value={`− ${eur(totals.deposit)}`} />
            <div className="ps-kv big">
              <span>Solde restant dû</span>
              <span>{eur(totals.balanceDue)}</span>
            </div>
          </>
        )}
      </div>

      {order.notes && kind === 'bon' && (
        <div className="ps-soft" style={{ marginTop: 12, fontSize: 12 }}>
          <strong>Note :</strong> {order.notes}
        </div>
      )}

      <footer className="inv-foot">
        {kind === 'devis' ? (
          <div className="ps-soft">
            Devis sans engagement. Prix TVA comprise. Pour confirmer, contactez-nous ou
            répondez à cet email.
          </div>
        ) : (
          <div className="ps-soft">
            {company.invoice_terms || 'Paiement à réception de la facture.'}
          </div>
        )}
        {company.iban && <div className="ps-soft">Paiement par virement : {company.iban}</div>}
      </footer>

      <style>{css}</style>
    </PrintSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="ps-kv">
      <span className="ps-soft">{label}</span>
      <span className="r">{value}</span>
    </div>
  );
}

const css = `
.inv-head { display: flex; justify-content: space-between; gap: 24px; }
.inv-co { font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; color: #1c1712; }
.inv-meta { text-align: right; }
.inv-meta h1 { font-size: 20px; margin: 0 0 4px; }
.inv-to { margin: 28px 0 22px; }
.inv-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b6051; margin-bottom: 3px; }
.inv-client { font-weight: 600; }
.inv-sub { font-size: 11px; color: #877a64; margin-top: 2px; }
.inv-totals { margin-left: auto; width: 300px; }
.inv-vatbox { margin: 6px 0; padding: 6px 10px; background: #f7f1e6; border-radius: 3px; font-size: 12px; }
.inv-foot { margin-top: 34px; padding-top: 14px; border-top: 1px solid #eadfce; font-size: 12px; }
`;
