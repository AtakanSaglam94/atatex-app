import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { useData } from '@/data/DataProvider';
import { useOrders } from '@/data/useOrders';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { clientDisplayName } from '@/lib/format';
import type { Appointment, AppointmentKind } from '@/types';

const KINDS: { v: AppointmentKind; l: string }[] = [
  { v: 'mesure', l: 'Prise de mesure' },
  { v: 'pose', l: 'Pose à domicile' },
  { v: 'livraison', l: 'Livraison' },
  { v: 'rdv', l: 'Rendez-vous' },
  { v: 'autre', l: 'Autre' },
];

function toLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function AppointmentEditor({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const { clients } = useData();
  const { orders } = useOrders();
  const toast = useToast();
  const [f, setF] = useState(() => ({
    kind: (appointment?.kind ?? 'mesure') as AppointmentKind,
    title: appointment?.title ?? '',
    starts_at: toLocalInput(appointment?.starts_at ?? null),
    duration_min: appointment?.duration_min ?? 60,
    client_id: appointment?.client_id ?? '',
    order_id: appointment?.order_id ?? '',
    location: appointment?.location ?? '',
    notes: appointment?.notes ?? '',
  }));
  const [busy, setBusy] = useState(false);

  const clientOrders = orders.filter((o) => !f.client_id || o.client_id === f.client_id);

  async function save() {
    if (!f.starts_at) return toast.error('Date et heure requises.');
    setBusy(true);
    const payload = {
      kind: f.kind,
      title: f.title.trim(),
      starts_at: new Date(f.starts_at).toISOString(),
      duration_min: Number(f.duration_min) || 60,
      client_id: f.client_id || null,
      order_id: f.order_id || null,
      location: f.location.trim(),
      notes: f.notes.trim(),
    };
    const { error } = appointment
      ? await supabase.from('appointments').update(payload).eq('id', appointment.id)
      : await supabase.from('appointments').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(appointment ? 'Rendez-vous mis à jour.' : 'Rendez-vous ajouté.');
    onClose();
  }

  return (
    <Modal
      title={appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
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
      <div className="field-row">
        <div className="field">
          <label>Type</label>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as AppointmentKind })}>
            {KINDS.map((k) => (
              <option key={k.v} value={k.v}>
                {k.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Durée (min)</label>
          <input
            type="number"
            step="15"
            min={15}
            value={f.duration_min}
            onChange={(e) => setF({ ...f, duration_min: parseInt(e.target.value) || 60 })}
          />
        </div>
      </div>

      <div className="field">
        <label>Date et heure</label>
        <input
          type="datetime-local"
          value={f.starts_at}
          onChange={(e) => setF({ ...f, starts_at: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Intitulé (optionnel)</label>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Client</label>
          <select
            value={f.client_id}
            onChange={(e) => setF({ ...f, client_id: e.target.value, order_id: '' })}
          >
            <option value="">—</option>
            {[...clients]
              .sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {clientDisplayName(c)}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>Commande liée</label>
          <select value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value })}>
            <option value="">—</option>
            {clientOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Lieu</label>
        <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
    </Modal>
  );
}
