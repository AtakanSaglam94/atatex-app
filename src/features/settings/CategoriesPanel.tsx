import { useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { ProductCategory } from '@/types';

export function CategoriesPanel() {
  const { categories, products } = useData();
  const toast = useToast();
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<ProductCategory | null>(null);

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase
      .from('product_categories')
      .insert({ name: name.trim(), position: (categories.at(-1)?.position ?? 0) + 10 });
    if (error) toast.error(error.message);
    else {
      toast.ok('Catégorie ajoutée.');
      setName('');
    }
  }

  async function remove(c: ProductCategory) {
    setDeleting(null);
    if (products.some((p) => p.category_id === c.id)) {
      toast.error('Des produits utilisent cette catégorie.');
      return;
    }
    const { error } = await supabase.from('product_categories').delete().eq('id', c.id);
    if (error) toast.error(error.message);
    else toast.ok('Catégorie supprimée.');
  }

  return (
    <>
      <Panel title="Catégories de produits">
        <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          « Largeur max » surcharge la largeur maximale du type de confection pour les produits de
          cette catégorie (ex. tentures = 2,50 m pour les stores). Laisser vide sinon.
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th style={{ width: 150 }}>Largeur max (m)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} onDelete={() => setDeleting(c)} />
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: 12 }}>
          <input
            placeholder="Nouvelle catégorie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            style={{ flex: 1 }}
          />
          <button className="btn btn--primary" onClick={add}>
            <Icon name="plus" size={15} /> Ajouter
          </button>
        </div>
      </Panel>
      {deleting && (
        <ConfirmDialog
          title="Supprimer la catégorie"
          message={`Supprimer « ${deleting.name} » ?`}
          danger
          confirmLabel="Supprimer"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function CategoryRow({
  category,
  onDelete,
}: {
  category: ProductCategory;
  onDelete: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(category.name);
  const [max, setMax] = useState<string>(category.largeur_max?.toString() ?? '');
  const dirty = name !== category.name || max !== (category.largeur_max?.toString() ?? '');

  async function save() {
    if (!name.trim()) return;
    const { error } = await supabase
      .from('product_categories')
      .update({ name: name.trim(), largeur_max: max === '' ? null : parseFloat(max) || null })
      .eq('id', category.id);
    if (error) toast.error(error.message);
    else toast.ok('Catégorie enregistrée.');
  }

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min={0}
          placeholder="—"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {dirty && (
          <button className="btn btn--sm btn--primary" onClick={save}>
            OK
          </button>
        )}
        <button className="btn btn--ghost btn--sm" onClick={onDelete} aria-label="Supprimer">
          <Icon name="trash" size={15} />
        </button>
      </td>
    </tr>
  );
}
