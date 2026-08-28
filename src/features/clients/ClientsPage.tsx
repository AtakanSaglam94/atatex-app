import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { clientDisplayName, clientAddressText } from '@/lib/format';
import { ClientEditor } from './ClientEditor';
import type { Client } from '@/types';

export function ClientsPage() {
  const { clients } = useData();
  const { orders } = useOrders();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...clients]
      .sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)))
      .filter(
        (c) =>
          !q ||
          clientDisplayName(c).toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q),
      );
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
          <SearchInput value={search} onChange={setSearch} placeholder="Nom, email, ville…" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState message="Aucun client." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Adresse</th>
                  <th style={{ textAlign: 'right' }}>Cmd.</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => setEditing(c)}>
                    <td>
                      {clientDisplayName(c)}
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {c.client_type === 'professionnel' ? 'Professionnel' : 'Particulier'}
                        {c.vat ? ` · ${c.vat}` : ''}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {c.email}
                      {c.email && c.phone && <br />}
                      {c.phone && <span className="mono">{c.phone}</span>}
                    </td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                      {clientAddressText(c) || '—'}
                    </td>
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
          message={`Supprimer « ${clientDisplayName(deleting)} » ?`}
          danger
          confirmLabel="Supprimer"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
