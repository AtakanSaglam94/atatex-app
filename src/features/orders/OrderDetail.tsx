import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/auth/AuthProvider';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur, num } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import {
  fmtDate,
  statusLabel,
  STATUS_ORDER,
  STATUS_LABEL,
  terminalStatusLabel,
  fulfillmentText,
  isCancelled,
} from '@/lib/format';
import { generateUBL, downloadFile } from '@/lib/ubl';
import { PrintableInvoice } from '@/features/invoices/PrintableInvoice';
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
  const { company, pickupPoints, stockRolls } = useData();
  const { isAdmin } = useAuth();
  const pickupPoint = pickupPoints.find((p) => p.id === order.pickup_point_id) ?? null;
  const rollLabel = (id: string | null) =>
    id ? (stockRolls.find((r) => r.id === id)?.label || 'rouleau') : null;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [printNumber, setPrintNumber] = useState<string | null>(null);
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

  async function openInvoice() {
    setBusy(true);
    const number = order.invoice_number ?? (await assignInvoiceNumber(order.id));
    setBusy(false);
    if (!number) return toast.error('Numéro de facture impossible à générer.');
    setPrintNumber(number);
    if (!order.invoice_number) onChanged();
  }

  async function deleteOrder() {
    setConfirmDelete(false);
    setBusy(true);
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok('Commande supprimée.');
    onClose();
    onChanged();
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
          {isAdmin && (
            <button
              className="btn btn--danger"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              style={{ marginRight: 'auto' }}
            >
              <Icon name="trash" size={15} /> Supprimer
            </button>
          )}
          <button className="btn" onClick={exportUbl}>
            <Icon name="download" size={15} /> UBL / Peppol
          </button>
          <button className="btn" onClick={openInvoice} disabled={busy}>
            <Icon name="invoices" size={15} /> Facture
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
        {order.bank_transfer && totals.balanceDue > 0 && (
          <span className="badge badge--unpaid">Virement à vérifier</span>
        )}
        {order.invoice_number && <span className="badge badge--neutral">{order.invoice_number}</span>}
      </div>

      <div style={{ color: 'var(--ink-soft)', fontSize: 13.5, marginBottom: 14 }}>
        {order.client?.name ?? 'Client supprimé'} · {fmtDate(order.order_date)}
        {order.client?.phone ? ` · ${order.client.phone}` : ''}
        <br />
        {fulfillmentText(order.fulfillment, pickupPoint)}
      </div>

      {/* progression de statut */}
      {isCancelled(order.status) ? (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            background: 'var(--danger-weak)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          Commande annulée — exclue du chiffre d'affaires et des statistiques.
          <button className="btn btn--sm" disabled={busy} onClick={() => changeStatus('recue')}>
            Réactiver
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
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
          <button
            className="btn btn--sm btn--danger"
            disabled={busy}
            onClick={() => changeStatus('annule')}
            style={{ marginLeft: 'auto' }}
          >
            Annuler la commande
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.label}
                  {it.is_confection && (
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      Largeur {num(it.largeur ?? 0, 0, 2)} m
                      {it.hauteur ? ` × hauteur ${num(it.hauteur, 0, 2)} m` : ''} → {num(it.metrage ?? 0, 0, 2)} m à
                      commander · frais {eur(it.frais_confection ?? 0)}/m
                      {rollLabel(it.roll_id) ? ` · ${rollLabel(it.roll_id)}` : ''}
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
        <Row label="Sous-total (TVA comprise)" value={eur(totals.subtotalTTC)} />
        {totals.discountAmount > 0 && <Row label="Remise" value={`− ${eur(totals.discountAmount)}`} />}
        {totals.roundingDelta !== 0 && (
          <Row label="Arrondi" value={eur(totals.roundingDelta)} />
        )}
        <Row label="Total à payer (TTC)" value={eur(totals.totalDue)} strong />
        <Row label="dont base HT" value={eur(totals.totalHT)} />
        <Row label={`dont TVA ${num(vatRate)} %`} value={eur(totals.tva)} />
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

      {printNumber && company && (
        <PrintableInvoice
          order={order}
          company={company}
          totals={totals}
          invoiceNumber={printNumber}
          onClose={() => setPrintNumber(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer la commande"
          message={`Supprimer définitivement la commande ${order.order_number} ? Cette action est irréversible. (Pour un simple problème, utilise plutôt « Annuler la commande ».)`}
          danger
          confirmLabel="Supprimer définitivement"
          onConfirm={deleteOrder}
          onCancel={() => setConfirmDelete(false)}
        />
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
