import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur } from '@/lib/money';
import { UNIT_LABEL, CONFECTION_CATEGORY_LABEL } from '@/lib/format';
import type { Product, ProductUnit } from '@/types';

export function StockPage() {
  const { products, categories } = useData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...products]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, search]);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';

  async function remove(p: Product) {
    const { error } = await supabase.from('products').update({ active: false }).eq('id', p.id);
    setDeleting(null);
    if (error) toast.error(error.message);
    else toast.ok('Produit retiré du catalogue.');
  }

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${products.filter((p) => p.active).length} références actives`}
        action={
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Ajouter un produit
          </button>
        }
      />
      <Panel>
        <div style={{ padding: 12 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Nom ou référence…" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState message="Aucun produit." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Réf.</th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Prix</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setEditing(p)} style={p.active ? undefined : { opacity: 0.5 }}>
                    <td>
                      {p.name}
                      {p.confection_category && (
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          Confection : {CONFECTION_CATEGORY_LABEL[p.confection_category]}
                        </div>
                      )}
                    </td>
                    <td className="mono">{p.sku}</td>
                    <td>{catName(p.category_id)}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {eur(p.price)}/{UNIT_LABEL[p.unit]}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span className={`badge badge--${p.stock <= p.low_stock_at ? 'low' : 'neutral'}`}>
                        {p.stock} {p.unit === 'm' ? 'm' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(p);
                        }}
                        aria-label="Retirer"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Retirer le produit"
          message={`Retirer « ${deleting.name} » du catalogue ? Les commandes existantes ne changent pas.`}
          danger
          confirmLabel="Retirer"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function ProductEditor({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { categories } = useData();
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_id: product?.category_id ?? (categories[0]?.id ?? ''),
    price: product?.price ?? 0,
    cost_price: product?.cost_price ?? 0,
    unit: (product?.unit ?? 'm') as ProductUnit,
    stock: product?.stock ?? 0,
    low_stock_at: product?.low_stock_at ?? 5,
    max_qty_per_line: product?.max_qty_per_line ?? ('' as number | ''),
    largeur_min: product?.largeur_min ?? ('' as number | ''),
    largeur_max: product?.largeur_max ?? ('' as number | ''),
    confection_category:
      product?.confection_category ?? ('' as '' | 'rideau_voilage' | 'tenture'),
    photo_url: product?.photo_url ?? '',
    active: product?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!f.name.trim()) return toast.error('Le nom est obligatoire.');
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      category_id: f.category_id || null,
      price: Number(f.price) || 0,
      cost_price: Number(f.cost_price) || 0,
      unit: f.unit,
      stock: Number(f.stock) || 0,
      low_stock_at: Number(f.low_stock_at) || 0,
      max_qty_per_line: f.max_qty_per_line === '' ? null : Number(f.max_qty_per_line) || null,
      largeur_min: f.largeur_min === '' ? null : Number(f.largeur_min) || null,
      largeur_max: f.largeur_max === '' ? null : Number(f.largeur_max) || null,
      confection_category: f.unit === 'm' && f.confection_category ? f.confection_category : null,
      photo_url: f.photo_url.trim(),
      active: f.active,
    };
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(product ? 'Produit mis à jour.' : 'Produit ajouté.');
    onClose();
  }

  return (
    <Modal
      title={product ? 'Modifier le produit' : 'Nouveau produit'}
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
      <div className="field">
        <label>Nom du produit</label>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Référence</label>
          <input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
        </div>
        <div className="field">
          <label>Catégorie</label>
          <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Vendu au</label>
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as ProductUnit })}>
            <option value="m">Mètre (tissu / rail / ruflette…)</option>
            <option value="piece">Pièce</option>
            <option value="paquet_100">Paquet de 100</option>
            <option value="kit">Kit / ensemble</option>
          </select>
        </div>
        <div className="field">
          <label>Prix de vente (€ / unité)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={f.price}
            onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="field">
        <label>Prix de revient (€ / unité) — optionnel</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={f.cost_price || ''}
          onChange={(e) => setF({ ...f, cost_price: parseFloat(e.target.value) || 0 })}
        />
        <div className="hint">Prix d'achat. Sert au calcul de la marge sur le tableau de bord.</div>
      </div>
      <div className="field">
        <label>Quantité maximum par ligne de commande</label>
        <input
          type="number"
          step="0.1"
          min={0}
          placeholder="Sans limite"
          value={f.max_qty_per_line}
          onChange={(e) =>
            setF({ ...f, max_qty_per_line: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
          }
        />
        <div className="hint">Ex. rail = 6 m. Au-delà, l'utilisateur doit ajouter une 2ᵉ ligne.</div>
      </div>
      {f.unit === 'm' && (
        <div className="field">
          <label>Catégorie de confection</label>
          <select
            value={f.confection_category}
            onChange={(e) =>
              setF({ ...f, confection_category: e.target.value as typeof f.confection_category })
            }
          >
            <option value="">Non confectionnable (rail, ruflette…)</option>
            <option value="rideau_voilage">{CONFECTION_CATEGORY_LABEL.rideau_voilage}</option>
            <option value="tenture">{CONFECTION_CATEGORY_LABEL.tenture}</option>
          </select>
          <div className="hint">
            Détermine quels frais de confection s'appliquent. Pour un store, choisir
            « rideau / voilage » ou « tenture » selon le type de toile.
          </div>
        </div>
      )}
      {f.unit === 'm' && f.confection_category && (
        <div className="field-row">
          <div className="field">
            <label>Largeur min pour ce produit (m)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Selon le type"
              value={f.largeur_min}
              onChange={(e) =>
                setF({ ...f, largeur_min: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label>Largeur max pour ce produit (m)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Selon le type / la catégorie"
              value={f.largeur_max}
              onChange={(e) =>
                setF({ ...f, largeur_max: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
              }
            />
            <div className="hint">Surcharge le type et la catégorie (ex. toile de store pour tenture = 2,50 m).</div>
          </div>
        </div>
      )}
      <div className="field-row">
        <div className="field">
          <label>Stock actuel</label>
          <input
            type="number"
            step="0.01"
            value={f.stock}
            onChange={(e) => setF({ ...f, stock: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Seuil d'alerte</label>
          <input
            type="number"
            step="1"
            value={f.low_stock_at}
            onChange={(e) => setF({ ...f, low_stock_at: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="field">
        <label>Photo (URL)</label>
        <input
          value={f.photo_url}
          onChange={(e) => setF({ ...f, photo_url: e.target.value })}
          placeholder="https://…"
        />
        <div className="hint">Vignette affichée dans le catalogue (vue tablette).</div>
      </div>
    </Modal>
  );
}
