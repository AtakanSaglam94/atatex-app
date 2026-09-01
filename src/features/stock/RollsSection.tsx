import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { num } from '@/lib/money';
import { rollConsumption, rollRemaining } from '@/lib/rolls';
import type { Product, StockRoll } from '@/types';

const blankRoll = {
  label: '',
  length_initial: 0 as number | '',
  manual_adjustment: 0 as number | '',
  location: '',
  barcode: '',
  received_at: '',
  notes: '',
  active: true,
};

export function RollsSection({ product }: { product: Product }) {
  const { stockRolls } = useData();
  const { orders } = useOrders();
  const toast = useToast();
  const consumed = useMemo(() => rollConsumption(orders), [orders]);
  const rolls = stockRolls.filter((r) => r.product_id === product.id);

  const [form, setForm] = useState<typeof blankRoll | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startAdd() {
    setEditId(null);
    setForm({ ...blankRoll });
  }
  function startEdit(r: StockRoll) {
    setEditId(r.id);
    setForm({
      label: r.label,
      length_initial: r.length_initial,
      manual_adjustment: r.manual_adjustment,
      location: r.location,
      barcode: r.barcode,
      received_at: r.received_at ?? '',
      notes: r.notes,
      active: r.active,
    });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    const payload = {
      product_id: product.id,
      label: form.label.trim(),
      length_initial: Number(form.length_initial) || 0,
      manual_adjustment: Number(form.manual_adjustment) || 0,
      location: form.location.trim(),
      barcode: form.barcode.trim(),
      received_at: form.received_at || null,
      notes: form.notes.trim(),
      active: form.active,
    };
    const { error } = editId
      ? await supabase.from('stock_rolls').update(payload).eq('id', editId)
      : await supabase.from('stock_rolls').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(editId ? 'Rouleau mis à jour.' : 'Rouleau ajouté.');
    setForm(null);
    setEditId(null);
  }

  async function remove(r: StockRoll) {
    if ((consumed.get(r.id) ?? 0) > 0) {
      toast.error('Ce rouleau a déjà servi à des commandes : désactive-le plutôt.');
      return;
    }
    const { error } = await supabase.from('stock_rolls').delete().eq('id', r.id);
    if (error) toast.error(error.message);
    else toast.ok('Rouleau supprimé.');
  }

  const totalRemaining = rolls
    .filter((r) => r.active)
    .reduce((s, r) => s + rollRemaining(r, consumed), 0);

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px dashed var(--line-strong)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>
          Rouleaux · {num(totalRemaining, 0, 2)} m au total
        </strong>
        <button type="button" className="btn btn--sm" onClick={startAdd}>
          <Icon name="plus" size={14} /> Rouleau
        </button>
      </div>

      {rolls.length === 0 && !form && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
          Aucun rouleau. Ajoute-en pour suivre les métrages séparément — sinon le
          stock reste géré par le champ « Stock actuel » ci-dessus.
        </div>
      )}

      {rolls.length > 0 && (
        <div className="table-wrap">
          <table>
            <tbody>
              {rolls.map((r) => {
                const rem = rollRemaining(r, consumed);
                return (
                  <tr key={r.id} style={r.active ? undefined : { opacity: 0.5 }}>
                    <td>
                      {r.label || 'Rouleau'}
                      {r.location && (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}> · {r.location}</span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {num(rem, 0, 2)} / {num(r.length_initial, 0, 2)} m
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(r)}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(r)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="field-row field-row--3">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Nom du rouleau</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Rouleau A"
              />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Longueur initiale (m)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.length_initial}
                onChange={(e) =>
                  setForm({ ...form, length_initial: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Correction (± m)</label>
              <input
                type="number"
                step="0.01"
                value={form.manual_adjustment}
                onChange={(e) =>
                  setForm({ ...form, manual_adjustment: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div className="field-row field-row--3">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Emplacement</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Code-barres</label>
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Reçu le</label>
              <input
                type="date"
                value={form.received_at}
                onChange={(e) => setForm({ ...form, received_at: e.target.value })}
              />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Actif (proposé à la découpe)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn--sm btn--primary" onClick={save} disabled={busy}>
              {busy ? '…' : 'Enregistrer le rouleau'}
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => {
                setForm(null);
                setEditId(null);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
