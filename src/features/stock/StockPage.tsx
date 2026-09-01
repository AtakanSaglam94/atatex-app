import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur, num } from '@/lib/money';
import { UNIT_LABEL, CONFECTION_CATEGORY_LABEL } from '@/lib/format';
import { uploadProductPhoto, deleteProductPhoto, MAX_PHOTOS } from '@/lib/photos';
import { rollConsumption, displayedStock } from '@/lib/rolls';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RollsSection } from './RollsSection';
import type { Product, ProductUnit } from '@/types';

export function StockPage() {
  const { products, categories, stockRolls } = useData();
  const { orders } = useOrders();
  const consumed = useMemo(() => rollConsumption(orders), [orders]);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const usedProductIds = useMemo(
    () => new Set(orders.flatMap((o) => o.items.map((it) => it.product_id))),
    [orders],
  );
  const archivedCount = products.filter((p) => !p.active).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...products]
      .filter((p) => (showArchived ? true : p.active))
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, search, showArchived]);

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';

  async function remove(p: Product) {
    setDeleting(null);
    if (usedProductIds.has(p.id)) {
      // produit utilisé dans des commandes : on archive pour ne pas casser l'historique
      const { error } = await supabase.from('products').update({ active: false }).eq('id', p.id);
      if (error) toast.error(error.message);
      else toast.ok('Produit archivé (il figure dans des commandes existantes).');
    } else {
      const { error } = await supabase.from('products').delete().eq('id', p.id);
      if (error) toast.error(error.message);
      else toast.ok('Produit supprimé.');
    }
  }

  async function unarchive(p: Product) {
    const { error } = await supabase.from('products').update({ active: true }).eq('id', p.id);
    if (error) toast.error(error.message);
    else toast.ok('Produit réactivé.');
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
        <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Nom ou référence…" />
          {archivedCount > 0 && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--ink-soft)' }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Voir les archivés ({archivedCount})
            </label>
          )}
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
                      {(() => {
                        const st = displayedStock(p, stockRolls, consumed);
                        return (
                          <span className={`badge badge--${st.total <= p.low_stock_at ? 'low' : 'neutral'}`}>
                            {num(st.total, 0, 2)} {p.unit === 'm' ? 'm' : ''}
                            {st.hasRolls ? ` · ${stockRolls.filter((r) => r.product_id === p.id && r.active).length} rlx` : ''}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!p.active && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void unarchive(p);
                          }}
                          title="Réactiver"
                        >
                          <Icon name="check" size={16} />
                        </button>
                      )}
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(p);
                        }}
                        aria-label="Supprimer"
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
        <ErrorBoundary label="Fiche produit">
          <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
        </ErrorBoundary>
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le produit"
          message={
            usedProductIds.has(deleting.id)
              ? `« ${deleting.name} » figure dans des commandes : il sera archivé (masqué) sans casser l'historique. Continuer ?`
              : `Supprimer définitivement « ${deleting.name} » ?`
          }
          danger
          confirmLabel={usedProductIds.has(deleting.id) ? 'Archiver' : 'Supprimer'}
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
    barcode: product?.barcode ?? '',
    category_id: product?.category_id ?? (categories[0]?.id ?? ''),
    price: product?.price ?? 0,
    cost_price: product?.cost_price ?? 0,
    unit: (product?.unit ?? 'm') as ProductUnit,
    stock: product?.stock ?? 0,
    low_stock_at: product?.low_stock_at ?? 5,
    max_qty_per_line: product?.max_qty_per_line ?? ('' as number | ''),
    largeur_min: product?.largeur_min ?? ('' as number | ''),
    largeur_max: product?.largeur_max ?? ('' as number | ''),
    hauteur_min: product?.hauteur_min ?? ('' as number | ''),
    hauteur_max: product?.hauteur_max ?? ('' as number | ''),
    confection_category:
      product?.confection_category ?? ('' as '' | 'rideau_voilage' | 'tenture'),
    active: product?.active ?? true,
  }));
  const [photos, setPhotos] = useState<string[]>(() => product?.photo_urls ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function addPhotos(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, MAX_PHOTOS - photos.length);
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadProductPhoto(file, f.name || 'produit');
        setPhotos((p) => [...p, url]);
      }
    } catch (e) {
      toast.error(`Envoi de la photo impossible : ${(e as Error).message ?? e}`);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((u) => u !== url));
    void deleteProductPhoto(url);
  }

  async function save() {
    if (!f.name.trim()) return toast.error('Le nom est obligatoire.');
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      barcode: f.barcode.trim(),
      category_id: f.category_id || null,
      price: Number(f.price) || 0,
      cost_price: Number(f.cost_price) || 0,
      unit: f.unit,
      stock: Number(f.stock) || 0,
      low_stock_at: Number(f.low_stock_at) || 0,
      max_qty_per_line: f.max_qty_per_line === '' ? null : Number(f.max_qty_per_line) || null,
      largeur_min: f.largeur_min === '' ? null : Number(f.largeur_min) || null,
      largeur_max: f.largeur_max === '' ? null : Number(f.largeur_max) || null,
      hauteur_min: f.hauteur_min === '' ? null : Number(f.hauteur_min) || null,
      hauteur_max: f.hauteur_max === '' ? null : Number(f.hauteur_max) || null,
      confection_category: f.unit === 'm' && f.confection_category ? f.confection_category : null,
      photo_urls: photos,
      photo_url: photos[0] ?? '',
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
      <div className="field-row field-row--3">
        <div className="field">
          <label>Référence</label>
          <input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
        </div>
        <div className="field">
          <label>Code-barres</label>
          <input
            value={f.barcode}
            onChange={(e) => setF({ ...f, barcode: e.target.value })}
            placeholder="Scan ou saisie"
          />
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
          <label>Prix de vente TTC (€ / unité)</label>
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
        <label>Prix de revient HT (€ / unité) — optionnel</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={f.cost_price || ''}
          onChange={(e) => setF({ ...f, cost_price: parseFloat(e.target.value) || 0 })}
        />
        <div className="hint">
          Prix d'achat hors TVA (montant net de la facture fournisseur). Sert au calcul de la marge.
        </div>
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
      {f.unit === 'm' && f.confection_category && (
        <div className="field-row">
          <div className="field">
            <label>Hauteur min pour ce produit (m)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Aucune"
              value={f.hauteur_min}
              onChange={(e) =>
                setF({ ...f, hauteur_min: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label>Hauteur max pour ce produit (m)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Aucune"
              value={f.hauteur_max}
              onChange={(e) =>
                setF({ ...f, hauteur_max: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
              }
            />
            <div className="hint">
              Ex. une toile de 2,90 m de haut : impossible de commander une hauteur de 3 m.
            </div>
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
        <label>Photos ({photos.length}/{MAX_PHOTOS})</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((url, i) => (
            <div
              key={url}
              style={{
                position: 'relative',
                width: 82,
                height: 82,
                borderRadius: 6,
                overflow: 'hidden',
                border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--line-strong)',
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                aria-label="Retirer la photo"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(20,16,12,0.65)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="x" size={13} />
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setPhotos((p) => [url, ...p.filter((u) => u !== url)])}
                  title="Définir comme photo principale"
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 2,
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'rgba(20,16,12,0.65)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Principale
                </button>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label
              style={{
                width: 82,
                height: 82,
                borderRadius: 6,
                border: '1px dashed var(--line-strong)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: uploading ? 'wait' : 'pointer',
                color: 'var(--ink-soft)',
                fontSize: 11,
              }}
            >
              <Icon name="plus" size={16} />
              {uploading ? '…' : 'Ajouter'}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={uploading}
                onChange={(e) => addPhotos(e.target.files)}
              />
            </label>
          )}
        </div>
        <div className="hint">
          La 1ʳᵉ photo (bordure) sert de vignette au catalogue. JPEG / PNG / WebP, 5 Mo max.
        </div>
      </div>

      {product && f.unit === 'm' && <RollsSection product={product} />}
    </Modal>
  );
}
