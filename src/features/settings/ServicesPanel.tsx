import { useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur } from '@/lib/money';
import type { Service } from '@/types';

export function ServicesPanel() {
  const { services } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  async function remove(s: Service) {
    setDeleting(null);
    const { error } = await supabase.from('services').delete().eq('id', s.id);
    if (error) toast.error(error.message);
    else toast.ok('Service supprimé.');
  }

  return (
    <>
      <Panel
        title="Services facturables"
        action={
          <button className="btn btn--sm btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={15} /> Ajouter
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => setEditing(s)} style={s.active ? undefined : { opacity: 0.5 }}>
                  <td>{s.name}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {eur(s.price)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(s);
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
        <ServiceEditor service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le service"
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

function ServiceEditor({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: service?.name ?? '',
    price: service?.price ?? 0,
    active: service?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!f.name.trim()) return toast.error('Le nom est obligatoire.');
    setBusy(true);
    const { error } = service
      ? await supabase.from('services').update(f).eq('id', service.id)
      : await supabase.from('services').insert(f);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(service ? 'Service mis à jour.' : 'Service ajouté.');
    onClose();
  }

  return (
    <Modal
      title={service ? 'Modifier le service' : 'Nouveau service'}
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
        <label>Nom du service</label>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Prise de mesure, Livraison, Pose à domicile…" />
      </div>
      <div className="field">
        <label>Prix TTC (€)</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={f.price}
          onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        Actif
      </label>
    </Modal>
  );
}
