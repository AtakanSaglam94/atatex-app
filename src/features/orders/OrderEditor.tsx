import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { eur, num } from '@/lib/money';
import { computeOrderTotals } from '@/lib/order-totals';
import { STATUS_LABEL, STATUS_ORDER, terminalStatusLabel, todayISO, UNIT_LABEL } from '@/lib/format';
import type { OrderWithRelations } from '@/types';
import {
  computeLine,
  draftFromOrderItem,
  newFreeLine,
  newProductLine,
  newServiceLine,
  type DraftItem,
} from './orderLines';
import { saveOrder, type OrderDraft } from './saveOrder';

interface Props {
  existing: OrderWithRelations | null;
  onClose: () => void;
  onSaved: (orderId: string) => void;
}

export function OrderEditor({ existing, onClose, onSaved }: Props) {
  const { clients, products, services, confectionTypes, categories, company } = useData();
  const toast = useToast();
  const vatRate = company?.vat_rate ?? 21;

  const [draft, setDraft] = useState<OrderDraft>(() =>
    existing
      ? {
          id: existing.id,
          client_id: existing.client_id,
          order_date: existing.order_date,
          status: existing.status,
          fulfillment: existing.fulfillment,
          discount_type: existing.discount_type,
          discount_value: existing.discount_value,
          round_total: existing.round_total,
          deposit_amount: existing.deposit_amount,
          notes: existing.notes,
          items: existing.items.map(draftFromOrderItem),
        }
      : {
          id: null,
          client_id: '',
          order_date: todayISO(),
          status: 'recue',
          fulfillment: 'retrait',
          discount_type: 'none',
          discount_value: 0,
          round_total: false,
          deposit_amount: 0,
          notes: '',
          items: [newProductLine()],
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof OrderDraft>(k: K, v: OrderDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const setItem = (key: string, patch: Partial<DraftItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    }));
  const removeItem = (key: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((it) => it.key !== key) }));

  const computed = useMemo(
    () => draft.items.map((d) => ({ d, c: computeLine(d, products, confectionTypes, categories) })),
    [draft.items, products, confectionTypes, categories],
  );

  const totals = useMemo(
    () =>
      computeOrderTotals({
        items: computed.map(({ c }) => ({ line_total: c.line_total })),
        discountType: draft.discount_type,
        discountValue: draft.discount_value,
        roundTotal: draft.round_total,
        depositAmount: draft.deposit_amount,
        vatRate,
      }),
    [computed, draft.discount_type, draft.discount_value, draft.round_total, draft.deposit_amount, vatRate],
  );

  const usedServiceIds = new Set(draft.items.filter((i) => i.kind === 'service').map((i) => i.service_id));

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await saveOrder(
      draft,
      products,
      confectionTypes,
      categories,
      existing?.status ?? null,
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Enregistrement impossible.');
      return;
    }
    toast.ok(existing ? 'Commande mise à jour.' : 'Commande créée.');
    onSaved(res.orderId!);
  }

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(totals.balanceDue.toFixed(2));
      toast.ok(`Montant copié : ${eur(totals.balanceDue)}`);
    } catch {
      toast.error('Copie impossible sur cet appareil.');
    }
  }

  return (
    <Modal
      title={existing ? `Commande ${existing.order_number}` : 'Nouvelle commande'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn" onClick={copyAmount} title="Pour saisir le montant dans Bancontact Pro">
            <Icon name="copy" size={16} /> Copier le montant
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'Enregistrement…' : existing ? 'Enregistrer' : 'Créer la commande'}
          </button>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}

      <div className="field-row">
        <div className="field">
          <label>Client</label>
          <select value={draft.client_id} onChange={(e) => set('client_id', e.target.value)}>
            <option value="">Sélectionner…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={draft.order_date}
            onChange={(e) => set('order_date', e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Remise / retrait</label>
          <select
            value={draft.fulfillment}
            onChange={(e) => set('fulfillment', e.target.value as OrderDraft['fulfillment'])}
          >
            <option value="retrait">Retrait en magasin / marché → « Finalisé »</option>
            <option value="livraison">Livraison → « Livré »</option>
          </select>
        </div>
        <div className="field">
          <label>Statut</label>
          <select
            value={draft.status}
            onChange={(e) => set('status', e.target.value as OrderDraft['status'])}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {s === 'termine' ? terminalStatusLabel(draft.fulfillment) : STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="label" style={{ marginTop: 6 }}>Articles</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {computed.map(({ d, c }) =>
          d.kind === 'produit' ? (
            <ProductLineRow
              key={d.key}
              draft={d}
              computed={c}
              onChange={(patch) => setItem(d.key, patch)}
              onRemove={() => removeItem(d.key)}
            />
          ) : (
            <SimpleLineRow
              key={d.key}
              draft={d}
              lineTotal={c.line_total}
              onChange={(patch) => setItem(d.key, patch)}
              onRemove={() => removeItem(d.key)}
            />
          ),
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => set('items', [...draft.items, newProductLine()])}
        >
          <Icon name="plus" size={15} /> Produit
        </button>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => set('items', [...draft.items, newFreeLine()])}
        >
          <Icon name="plus" size={15} /> Supplément libre
        </button>
      </div>

      {services.filter((s) => s.active && !usedServiceIds.has(s.id)).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="label">Services</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {services
              .filter((s) => s.active && !usedServiceIds.has(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  className="btn btn--sm"
                  onClick={() => set('items', [...draft.items, newServiceLine(s)])}
                >
                  + {s.name} ({eur(s.price)})
                </button>
              ))}
          </div>
        </div>
      )}

      {/* --- Remise & arrondi --- */}
      <div className="field-row field-row--3" style={{ marginTop: 18 }}>
        <div className="field">
          <label>Remise</label>
          <select
            value={draft.discount_type}
            onChange={(e) => set('discount_type', e.target.value as OrderDraft['discount_type'])}
          >
            <option value="none">Aucune</option>
            <option value="montant">Montant fixe (€)</option>
            <option value="pourcent">Pourcentage (%)</option>
          </select>
        </div>
        <div className="field">
          <label>Valeur de la remise</label>
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={draft.discount_type === 'none'}
            value={draft.discount_value || ''}
            onChange={(e) => set('discount_value', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="field">
          <label>Acompte déjà versé (€)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.deposit_amount || ''}
            onChange={(e) => set('deposit_amount', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
        <input
          type="checkbox"
          checked={draft.round_total}
          onChange={(e) => set('round_total', e.target.checked)}
        />
        Arrondir le total à l'euro (paiement en espèces)
      </label>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Notes internes</label>
        <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {/* --- Totaux --- */}
      <div
        style={{
          borderTop: '1px dashed var(--line-strong)',
          marginTop: 8,
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Row label="Sous-total HT" value={eur(totals.subtotalHT)} />
        {totals.discountAmount > 0 && (
          <Row label="Remise" value={`− ${eur(totals.discountAmount)}`} />
        )}
        <Row label={`TVA (${num(vatRate)} %)`} value={eur(totals.tva)} />
        {totals.roundingDelta !== 0 && (
          <Row label="Arrondi" value={`${totals.roundingDelta > 0 ? '+' : ''}${eur(totals.roundingDelta)}`} />
        )}
        <Row label="Total TTC" value={eur(totals.totalDue)} strong />
        {totals.deposit > 0 && (
          <>
            <Row label="Acompte versé" value={`− ${eur(totals.deposit)}`} />
            <Row label="Solde à payer" value={eur(totals.balanceDue)} strong />
          </>
        )}
      </div>
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

function ProductLineRow({
  draft,
  computed,
  onChange,
  onRemove,
}: {
  draft: DraftItem;
  computed: ReturnType<typeof computeLine>;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  const { products, confectionTypes, categories } = useData();
  const product = products.find((p) => p.id === draft.product_id) ?? null;
  const canConfection = product?.unit === 'm' && !!product?.confection_category;
  const selectedType = confectionTypes.find((t) => t.id === draft.confection_type_id) ?? null;
  const catMax = categories.find((c) => c.id === product?.category_id)?.largeur_max ?? null;
  const effMin = selectedType?.largeur_min ?? null;
  const effMax = catMax ?? selectedType?.largeur_max ?? null;
  const limitsHint =
    effMin != null || effMax != null
      ? `Largeur autorisée : ${effMin != null ? `min ${effMin} m` : ''}${
          effMin != null && effMax != null ? ' · ' : ''
        }${effMax != null ? `max ${effMax} m` : ''}`
      : null;

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        padding: 11,
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          style={{ flex: 1, minWidth: 0 }}
          value={draft.product_id ?? ''}
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value);
            onChange({
              product_id: e.target.value || null,
              label: p?.name ?? '',
              unit: p?.unit ?? 'piece',
              unit_price: p?.price ?? 0,
              is_confection: p?.unit === 'm' ? draft.is_confection : false,
            });
          }}
        >
          <option value="">Choisir un produit…</option>
          {products
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {eur(p.price)}/{UNIT_LABEL[p.unit]}
              </option>
            ))}
        </select>
        {!draft.is_confection && (
          <input
            type="number"
            min={0}
            step={draft.unit === 'm' ? '0.1' : '1'}
            style={{ width: 76 }}
            value={draft.qty || ''}
            onChange={(e) => onChange({ qty: parseFloat(e.target.value) || 0 })}
          />
        )}
        <span className="mono" style={{ width: 92, textAlign: 'right', fontSize: 13 }}>
          {eur(computed.line_total)}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={onRemove} aria-label="Retirer">
          <Icon name="x" size={16} />
        </button>
      </div>

      {!draft.is_confection && computed.error && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{computed.error}</div>
      )}

      {canConfection && (
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 13 }}
        >
          <input
            type="checkbox"
            checked={draft.is_confection}
            onChange={(e) =>
              onChange({
                is_confection: e.target.checked,
                confection_type_id: e.target.checked ? draft.confection_type_id : null,
              })
            }
          />
          <Icon name="scissors" size={15} /> Confection sur mesure
        </label>
      )}

      {draft.is_confection && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 8,
            padding: 10,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label>Largeur souhaitée (m)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.largeur ?? ''}
              onChange={(e) => onChange({ largeur: parseFloat(e.target.value) || null })}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Type de confection</label>
            <select
              value={draft.confection_type_id ?? ''}
              onChange={(e) => onChange({ confection_type_id: e.target.value || null })}
            >
              <option value="">Choisir…</option>
              {confectionTypes
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', fontSize: 12 }}>
            {computed.error ? (
              <span style={{ color: 'var(--danger)' }}>{computed.error}</span>
            ) : (
              <span style={{ color: 'var(--thread)' }}>{computed.note}</span>
            )}
            {limitsHint && !computed.error && (
              <span style={{ color: 'var(--ink-faint)', display: 'block', marginTop: 2 }}>
                {limitsHint}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleLineRow({
  draft,
  lineTotal,
  onChange,
  onRemove,
}: {
  draft: DraftItem;
  lineTotal: number;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        padding: 11,
        background: 'var(--surface-2)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        style={{ flex: 1, minWidth: 0 }}
        placeholder={draft.kind === 'service' ? 'Service' : 'Description du supplément'}
        value={draft.label}
        readOnly={draft.kind === 'service'}
        onChange={(e) => onChange({ label: e.target.value })}
      />
      <input
        type="number"
        min={0}
        step="1"
        style={{ width: 58 }}
        value={draft.qty || ''}
        onChange={(e) => onChange({ qty: parseFloat(e.target.value) || 0 })}
      />
      <input
        type="number"
        min={0}
        step="0.01"
        style={{ width: 84 }}
        value={draft.unit_price || ''}
        onChange={(e) => onChange({ unit_price: parseFloat(e.target.value) || 0 })}
      />
      <span className="mono" style={{ width: 92, textAlign: 'right', fontSize: 13 }}>
        {eur(lineTotal)}
      </span>
      <button className="btn btn--ghost btn--sm" onClick={onRemove} aria-label="Retirer">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
