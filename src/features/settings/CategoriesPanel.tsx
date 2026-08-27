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
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
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

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from('product_categories')
      .update({ name: editName.trim() })
      .eq('id', id);
    if (error) toast.error(error.message);
    else toast.ok('Catégorie renommée.');
    setEditId(null);
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
        <div className="table-wrap">
          <table>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    {editId === c.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {editId === c.id ? (
                      <button className="btn btn--sm btn--primary" onClick={() => saveEdit(c.id)}>
                        OK
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            setEditId(c.id);
                            setEditName(c.name);
                          }}
                          aria-label="Renommer"
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDeleting(c)}
                          aria-label="Supprimer"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
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
