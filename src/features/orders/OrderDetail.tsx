import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur, num } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { fmtDate, statusLabel, STATUS_ORDER, STATUS_LABEL, terminalStatusLabel } from '@/lib/format';
import { generateUBL, downloadFile } from '@/lib/ubl';
import { buildInvoicePdf } from '@/lib/invoice-pdf';
import { assignInvoiceNumber } from './invoiceNumber';
import { updateOrderStatus } from './saveOrder';
import type { OrderWithRelations } from '@/types';

interface Props {
  order: OrderWithRelations;
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => void;
}

export function OrderDetail({ order, onEdit, onClose, onChanged }: Props) {
  const { company } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const vatRate = company?.vat_rate ?? 21;

  const totals = useMemo(
    () =>
      computeOrderTotals({
        items: order.items,
        discountType: order.discount_type,
        discountValue: order.discount_value,
        roundTotal: order.round_total,
        depositAmount: order.deposit_amount,
        vatRate,
      }),
    [order, vatRate],
  );

  const paymentBadge =
    totals.balanceDue <= 0 ? 'paid' : totals.deposit > 0 ? 'partial' : 'unpaid';
  const paymentLabel =
    totals.balanceDue <= 0 ? 'Payée' : totals.deposit > 0 ? 'Acompte versé' : 'Impayée';

  async function changeStatus(status: OrderWithRelations['status']) {
    setBusy(true);
    const res = await updateOrderStatus(order.id, status, order.fulfillment);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? 'Erreur');
    toast.ok('Statut mis à jour — email envoyé au client.');
    onChanged();
  }

  async function markFullyPaid() {
    setBusy(true);
    const { error } = await supabase
      .from('orders')
      .update({ deposit_amount: totals.totalDue })
      .eq('id', order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok('Commande marquée comme payée.');
    onChanged();
  }

  async function makeInvoice() {
    setBusy(true);
    const number = order.invoice_number ?? (await assignInvoiceNumber(order.id));
    setBusy(false);
    if (!number) return toast.error('Numéro de facture impossible à générer.');
    buildInvoicePdf({ order, company: company!, totals, invoiceNumber: number }).download(
      `${number}.pdf`,
    );
    if (!order.invoice_number) onChanged();
  }

  function exportUbl() {
    if (!company?.name || !company?.vat) {
      toast.error('Complétez les informations d\'entreprise dans Réglages.');
      return;
    }
    const number = order.invoice_number ?? order.order_number;
    downloadFile(`${number}-ubl.xml`, generateUBL({ order, company, totals, invoiceNumber: number }), 'application/xml');
  }

  return (
    <Modal
      title={order.order_number}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Fermer
          </button>
          <button className="btn" onClick={exportUbl}>
            <Icon name="download" size={15} /> UBL / Peppol
          </button>
          <button className="btn" onClick={makeInvoice} disabled={busy}>
            <Icon name="invoices" size={15} /> Facture PDF
          </button>
          <button className="btn btn--primary" onClick={onEdit}>
            <Icon name="edit" size={15} /> Modifier
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className={`badge badge--${order.status}`}>
          {statusLabel(order.status, order.fulfillment)}
        </span>
        <span className={`badge badge--${paymentBadge}`}>{paymentLabel}</span>
        {order.invoice_number && <span className="badge badge--neutral">{order.invoice_number}</span>}
      </div>

      <div style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginBottom: 14 }}>
        {order.client?.name ?? 'Client supprimé'} · {fmtDate(order.order_date)}
        {order.client?.phone ? ` · ${order.client.phone}` : ''}
      </div>

      {/* progression de statut */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            className={'btn btn--sm' + (order.status === s ? ' btn--primary' : '')}
            disabled={busy || order.status === s}
            onClick={() => changeStatus(s)}
          >
            {s === 'termine' ? terminalStatusLabel(order.fulfillment) : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.label}
                  {it.is_confection && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      Largeur {num(it.largeur ?? 0, 0, 2)} m → {num(it.metrage ?? 0, 0, 2)} m à
                      commander · frais {eur(it.frais_confection ?? 0)}/m
                    </div>
                  )}
                </td>
                <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {num(it.qty, 0, 2)} {it.unit === 'm' ? 'm' : '×'} {eur(it.unit_price)}
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  {eur(it.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Row label="Sous-total HT" value={eur(totals.subtotalHT)} />
        {totals.discountAmount > 0 && <Row label="Remise" value={`− ${eur(totals.discountAmount)}`} />}
        <Row label={`TVA (${num(vatRate)} %)`} value={eur(totals.tva)} />
        {totals.roundingDelta !== 0 && (
          <Row label="Arrondi" value={eur(totals.roundingDelta)} />
        )}
        <Row label="Total TTC" value={eur(totals.totalDue)} strong />
        {totals.deposit > 0 && <Row label="Acompte versé" value={`− ${eur(totals.deposit)}`} />}
        <Row label="Solde à payer" value={eur(totals.balanceDue)} strong />
      </div>

      {totals.balanceDue > 0 && (
        <button className="btn btn--block" style={{ marginTop: 12 }} onClick={markFullyPaid} disabled={busy}>
          <Icon name="check" size={16} /> Marquer comme entièrement payée
        </button>
      )}

      {order.notes && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
          <strong>Notes :</strong> {order.notes}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: strong ? 16 : 13.5,
        fontWeight: strong ? 600 : 400,
        fontFamily: strong ? 'var(--font-display)' : undefined,
        color: strong ? 'var(--ink)' : 'var(--ink-soft)',
      }}
    >
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
