import { useMemo, useState } from 'react';
import { PageHeader, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { eur } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { fmtDate } from '@/lib/format';
import { PrintableInvoice } from './PrintableInvoice';
import { generateUBL, downloadFile } from '@/lib/ubl';
import { assignInvoiceNumber } from '@/features/orders/invoiceNumber';
import type { OrderTotals } from '@/lib/order-totals';
import type { OrderWithRelations } from '@/types';

type Filter = 'all' | 'unpaid' | 'paid';

export function InvoicesPage() {
  const { company } = useData();
  const { orders, reload } = useOrders();
  const toast = useToast();
  const vatRate = company?.vat_rate ?? 21;
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<
    { order: OrderWithRelations; totals: OrderTotals; number: string } | null
  >(null);

  const rows = useMemo(() => {
    return orders.map((o) => {
      const t = computeOrderTotals({
        items: o.items,
        discountType: o.discount_type,
        discountValue: o.discount_value,
        roundTotal: o.round_total,
        depositAmount: o.deposit_amount,
        vatRate,
      });
      return { o, t, paid: t.balanceDue <= 0 };
    });
  }, [orders, vatRate]);

  const filtered = rows.filter((r) =>
    filter === 'all' ? true : filter === 'paid' ? r.paid : !r.paid,
  );

  async function openInvoice(orderId: string) {
    const row = rows.find((r) => r.o.id === orderId);
    if (!row || !company) return;
    setBusyId(orderId);
    const number = row.o.invoice_number ?? (await assignInvoiceNumber(orderId));
    setBusyId(null);
    if (!number) return toast.error('Numéro de facture impossible.');
    setPrinting({ order: row.o, totals: row.t, number });
    if (!row.o.invoice_number) reload();
  }

  function ubl(orderId: string) {
    const row = rows.find((r) => r.o.id === orderId);
    if (!row || !company) return;
    if (!company.name || !company.vat) return toast.error('Complétez vos infos d\'entreprise (Réglages).');
    const number = row.o.invoice_number ?? row.o.order_number;
    downloadFile(
      `${number}-ubl.xml`,
      generateUBL({ order: row.o, company, totals: row.t, invoiceNumber: number }),
      'application/xml',
    );
  }

  return (
    <>
      <PageHeader title="Factures" subtitle="Générées à partir des commandes" />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'unpaid', 'paid'] as Filter[]).map((f) => (
          <button
            key={f}
            className={'btn btn--sm' + (filter === f ? ' btn--primary' : '')}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Toutes' : f === 'unpaid' ? 'À encaisser' : 'Payées'}
          </button>
        ))}
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <EmptyState message="Aucune facture pour ce filtre." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>TTC</th>
                  <th style={{ textAlign: 'right' }}>Solde</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ o, t, paid }) => (
                  <tr key={o.id}>
                    <td className="mono">{o.invoice_number ?? o.order_number}</td>
                    <td>{o.client?.name ?? '—'}</td>
                    <td>{fmtDate(o.order_date)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {eur(t.totalDue)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span className={`badge badge--${paid ? 'paid' : t.deposit > 0 ? 'partial' : 'unpaid'}`}>
                        {paid ? 'Payée' : eur(t.balanceDue)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => ubl(o.id)} title="Export UBL/Peppol">
                        <Icon name="download" size={15} />
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => openInvoice(o.id)}
                        disabled={busyId === o.id}
                        title="Facture"
                      >
                        <Icon name="invoices" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {printing && company && (
        <PrintableInvoice
          order={printing.order}
          company={company}
          totals={printing.totals}
          invoiceNumber={printing.number}
          onClose={() => setPrinting(null)}
        />
      )}
    </>
  );
}
