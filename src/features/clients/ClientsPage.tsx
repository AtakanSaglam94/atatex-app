import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';

const empty: Omit<Client, 'id' | 'created_at'> = {
  name: '',
  email: '',
  phone: '',
  address: '',
  vat: '',
  notes: '',
};

export function ClientsPage() {
  const { clients } = useData();
  const { orders } = useOrders();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, search]);

  const orderCount = (id: string) => orders.filter((o) => o.client_id === id).length;

  async function remove(c: Client) {
    if (orderCount(c.id) > 0) {
      toast.error('Ce client a des commandes : il ne peut pas être supprimé.');
      setDeleting(null);
      return;
    }
    const { error } = await supabase.from('clients').delete().eq('id', c.id);
    setDeleting(null);
    if (error) toast.error(error.message);
    else toast.ok('Client supprimé.');
  }

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''}`}
        action={
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Ajouter un client
          </button>
        }
      />

      <Panel>
        <div style={{ padding: 12 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un client…" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState message="Aucun client." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Adresse</th>
                  <th style={{ textAlign: 'right' }}>Commandes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => setEditing(c)}>
                    <td>
                      {c.name}
                      {c.vat && (
                        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          {c.vat}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {c.email}
                      {c.email && c.phone && <br />}
                      {c.phone && <span className="mono">{c.phone}</span>}
                    </td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{c.address || '—'}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {orderCount(c.id)}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(c);
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
        <ClientEditor
          client={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le client"
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

function ClientEditor({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (client ? { ...client } : { ...empty }));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) {
      toast.error('Le nom est obligatoire.');
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      vat: form.vat.trim(),
      notes: form.notes.trim(),
    };
    const { error } = client
      ? await supabase.from('clients').update(payload).eq('id', client.id)
      : await supabase.from('clients').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(client ? 'Client mis à jour.' : 'Client ajouté.');
    onClose();
  }

  return (
    <Modal
      title={client ? 'Modifier le client' : 'Nouveau client'}
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
        <label>Nom / entreprise</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <div className="hint">Utilisé pour les emails automatiques de suivi de commande.</div>
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Adresse</label>
        <textarea value={form.address} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="field">
        <label>N° de TVA (clients professionnels)</label>
        <input value={form.vat} onChange={(e) => set('vat', e.target.value)} placeholder="BE0123456789" />
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  );
}
