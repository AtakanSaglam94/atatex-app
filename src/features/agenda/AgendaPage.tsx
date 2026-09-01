import { useMemo, useState } from 'react';
import { PageHeader, Panel, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useAppointments } from '@/data/useAppointments';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { fmtDateTime } from '@/lib/format';
import { clientDisplayName } from '@/lib/format';
import { AppointmentEditor } from './AppointmentEditor';
import type { Appointment, AppointmentKind } from '@/types';

const KIND_LABEL: Record<AppointmentKind, string> = {
  mesure: 'Prise de mesure',
  pose: 'Pose à domicile',
  livraison: 'Livraison',
  rdv: 'Rendez-vous',
  autre: 'Autre',
};

export function AgendaPage() {
  const { clients } = useData();
  const { orders } = useOrders();
  const { appointments } = useAppointments();
  const toast = useToast();
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const groups = useMemo(() => {
    const list = appointments
      .filter((a) => (showPast ? true : new Date(a.starts_at) >= todayStart))
      .sort((a, b) =>
        showPast
          ? b.starts_at.localeCompare(a.starts_at)
          : a.starts_at.localeCompare(b.starts_at),
      );
    const by = new Map<string, Appointment[]>();
    for (const a of list) {
      const day = new Date(a.starts_at).toLocaleDateString('fr-BE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      (by.get(day) ?? by.set(day, []).get(day)!).push(a);
    }
    return [...by.entries()];
  }, [appointments, showPast, todayStart]);

  const clientName = (id: string | null) => {
    const c = clients.find((x) => x.id === id);
    return c ? clientDisplayName(c) : null;
  };
  const orderNo = (id: string | null) => orders.find((o) => o.id === id)?.order_number ?? null;

  async function toggleDone(a: Appointment) {
    const { error } = await supabase
      .from('appointments')
      .update({ done: !a.done })
      .eq('id', a.id);
    if (error) toast.error(error.message);
  }

  async function remove(a: Appointment) {
    setDeleting(null);
    const { error } = await supabase.from('appointments').delete().eq('id', a.id);
    if (error) toast.error(error.message);
    else toast.ok('Rendez-vous supprimé.');
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Prises de mesure, poses, livraisons et rendez-vous"
        action={
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} /> Rendez-vous
          </button>
        }
      />

      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, marginBottom: 14, color: 'var(--ink-soft)' }}>
        <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
        Voir le passé
      </label>

      {groups.length === 0 ? (
        <EmptyState message={showPast ? 'Aucun rendez-vous.' : 'Aucun rendez-vous à venir.'} />
      ) : (
        groups.map(([day, items]) => (
          <Panel key={day} title={day.charAt(0).toUpperCase() + day.slice(1)}>
            <div className="table-wrap">
              <table>
                <tbody>
                  {items.map((a) => (
                    <tr
                      key={a.id}
                      className="clickable"
                      onClick={() => setEditing(a)}
                      style={a.done ? { opacity: 0.55 } : undefined}
                    >
                      <td style={{ width: 60 }} className="mono">
                        {new Date(a.starts_at).toLocaleTimeString('fr-BE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <strong>{a.title || KIND_LABEL[a.kind]}</strong>
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                          {KIND_LABEL[a.kind]}
                          {clientName(a.client_id) ? ` · ${clientName(a.client_id)}` : ''}
                          {orderNo(a.order_id) ? ` · ${orderNo(a.order_id)}` : ''}
                          {a.location ? ` · ${a.location}` : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn--ghost btn--sm"
                          title={a.done ? 'Marquer à faire' : 'Marquer fait'}
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleDone(a);
                          }}
                        >
                          <Icon name="check" size={15} />
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(a);
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
        ))
      )}

      {editing && (
        <AppointmentEditor
          appointment={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le rendez-vous"
          message={`Supprimer « ${deleting.title || KIND_LABEL[deleting.kind]} » du ${fmtDateTime(deleting.starts_at)} ?`}
          danger
          confirmLabel="Supprimer"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
