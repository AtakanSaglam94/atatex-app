import { useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { PickupPoint } from '@/types';

export function PickupPointsPanel() {
  const { pickupPoints } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<PickupPoint | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PickupPoint | null>(null);

  async function remove(p: PickupPoint) {
    setDeleting(null);
    const { error } = await supabase.from('pickup_points').delete().eq('id', p.id);
    if (error) toast.error(error.message + ' — désactivez-le plutôt s\'il est utilisé.');
    else toast.ok('Point de retrait supprimé.');
  }

  return (
    <>
      <Panel
        title="Points de retrait"
        action={
          <button className="btn btn--sm btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={15} /> Ajouter
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Jour</th>
                <th>Adresse</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pickupPoints.map((p) => (
                <tr
                  key={p.id}
                  className="clickable"
                  onClick={() => setEditing(p)}
                  style={p.active ? undefined : { opacity: 0.5 }}
                >
                  <td>
                    {p.name}
                    {!p.active && (
                      <span className="badge badge--neutral" style={{ marginLeft: 6 }}>
                        inactif
                      </span>
                    )}
                  </td>
                  <td>{p.day || '—'}</td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{p.address || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(p);
                      }}
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <PickupPointEditor
          point={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le point de retrait"
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

function PickupPointEditor({ point, onClose }: { point: PickupPoint | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: point?.name ?? '',
    day: point?.day ?? '',
    address: point?.address ?? '',
    active: point?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!f.name.trim()) return toast.error('Le nom est obligatoire.');
    setBusy(true);
    const { error } = point
      ? await supabase.from('pickup_points').update(f).eq('id', point.id)
      : await supabase.from('pickup_points').insert(f);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(point ? 'Point de retrait mis à jour.' : 'Point de retrait ajouté.');
    onClose();
  }

  return (
    <Modal
      title={point ? 'Modifier le point de retrait' : 'Nouveau point de retrait'}
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
        <label>Nom</label>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Marché de Châtelineau"
        />
      </div>
      <div className="field">
        <label>Jour (optionnel)</label>
        <input
          value={f.day}
          onChange={(e) => setF({ ...f, day: e.target.value })}
          placeholder="Samedi"
        />
      </div>
      <div className="field">
        <label>Adresse (optionnel)</label>
        <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
        <input
          type="checkbox"
          checked={f.active}
          onChange={(e) => setF({ ...f, active: e.target.checked })}
        />
        Actif (proposé lors de la création d'une commande)
      </label>
    </Modal>
  );
}
