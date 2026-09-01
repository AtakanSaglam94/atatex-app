import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur } from '@/lib/money';
import { todayISO } from '@/lib/format';
import { uploadTo, deleteFromUrl } from '@/lib/uploads';
import { computeExpense } from './accounting';
import type { Expense, ExpenseCategory, ExpensePayment } from '@/types';

interface Props {
  expense: Expense | null;
  categories: ExpenseCategory[];
  onClose: () => void;
}

const PAYMENTS: { v: ExpensePayment; l: string }[] = [
  { v: 'virement', l: 'Virement' },
  { v: 'bancontact', l: 'Bancontact' },
  { v: 'carte', l: 'Carte' },
  { v: 'especes', l: 'Espèces' },
  { v: 'autre', l: 'Autre' },
];

export function ExpenseEditor({ expense, categories, onClose }: Props) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    expense_date: expense?.expense_date ?? todayISO(),
    supplier: expense?.supplier ?? '',
    category_id: expense?.category_id ?? (categories[0]?.id ?? ''),
    description: expense?.description ?? '',
    amount_ttc: expense?.amount_ttc ?? 0,
    vat_rate: expense?.vat_rate ?? 21,
    vat_deductible_pct:
      expense?.vat_deductible_pct ??
      categories[0]?.vat_deductible_pct ??
      100,
    payment_method: (expense?.payment_method ?? 'virement') as ExpensePayment,
    receipt_url: expense?.receipt_url ?? '',
    notes: expense?.notes ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const preview = computeExpense({
    ...(expense ?? ({} as Expense)),
    amount_ttc: Number(f.amount_ttc) || 0,
    vat_rate: Number(f.vat_rate) || 0,
    vat_deductible_pct: Number(f.vat_deductible_pct) || 0,
  });

  function pickCategory(id: string) {
    const cat = categories.find((c) => c.id === id);
    setF((s) => ({
      ...s,
      category_id: id,
      vat_deductible_pct: cat ? cat.vat_deductible_pct : s.vat_deductible_pct,
    }));
  }

  async function addReceipt(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTo('receipts', file, f.supplier || 'depense');
      setF((s) => ({ ...s, receipt_url: url }));
    } catch (e) {
      toast.error(`Justificatif : ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!f.amount_ttc || f.amount_ttc <= 0) return toast.error('Montant TTC requis.');
    setBusy(true);
    const payload = {
      expense_date: f.expense_date,
      supplier: f.supplier.trim(),
      category_id: f.category_id || null,
      description: f.description.trim(),
      amount_ttc: Number(f.amount_ttc) || 0,
      vat_rate: Number(f.vat_rate) || 0,
      vat_deductible_pct: Number(f.vat_deductible_pct) || 0,
      payment_method: f.payment_method,
      receipt_url: f.receipt_url,
      notes: f.notes.trim(),
    };
    const { error } = expense
      ? await supabase.from('expenses').update(payload).eq('id', expense.id)
      : await supabase.from('expenses').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(expense ? 'Dépense mise à jour.' : 'Dépense enregistrée.');
    onClose();
  }

  return (
    <Modal
      title={expense ? 'Modifier la dépense' : 'Nouvelle dépense / achat'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={f.expense_date}
            onChange={(e) => setF({ ...f, expense_date: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Fournisseur</label>
          <input value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <label>Catégorie</label>
        <select value={f.category_id} onChange={(e) => pickCategory(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Description</label>
        <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>

      <div className="field-row field-row--3">
        <div className="field">
          <label>Montant TTC (€)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={f.amount_ttc || ''}
            onChange={(e) => setF({ ...f, amount_ttc: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Taux TVA (%)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            value={f.vat_rate}
            onChange={(e) => setF({ ...f, vat_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>TVA récupérable (%)</label>
          <input
            type="number"
            step="5"
            min={0}
            max={100}
            value={f.vat_deductible_pct}
            onChange={(e) => setF({ ...f, vat_deductible_pct: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: 'var(--ink-soft)',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 10px',
        }}
      >
        Base HT : <strong>{eur(preview.ht)}</strong> · TVA : <strong>{eur(preview.tva)}</strong> ·
        TVA déductible : <strong>{eur(preview.tvaDeductible)}</strong>
      </div>

      <div className="field-row" style={{ marginTop: 14 }}>
        <div className="field">
          <label>Payé par</label>
          <select
            value={f.payment_method}
            onChange={(e) => setF({ ...f, payment_method: e.target.value as ExpensePayment })}
          >
            {PAYMENTS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Justificatif</label>
          {f.receipt_url ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={f.receipt_url} target="_blank" rel="noreferrer" className="btn btn--sm">
                <Icon name="invoices" size={14} /> Voir
              </a>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  void deleteFromUrl('receipts', f.receipt_url);
                  setF({ ...f, receipt_url: '' });
                }}
              >
                <Icon name="x" size={14} /> Retirer
              </button>
            </div>
          ) : (
            <label className="btn btn--sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
              <Icon name="plus" size={14} /> {uploading ? 'Envoi…' : 'Photo / PDF'}
              <input
                type="file"
                accept="image/*,application/pdf"
                hidden
                disabled={uploading}
                onChange={(e) => addReceipt(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
    </Modal>
  );
}
