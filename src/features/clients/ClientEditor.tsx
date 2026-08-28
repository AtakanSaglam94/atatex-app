import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { clientDisplayName } from '@/lib/format';
import type { Client, ClientType } from '@/types';

interface Props {
  client: Client | null;
  onClose: () => void;
  /** appelé avec le client créé/modifié (utile pour la création rapide depuis une commande) */
  onSaved?: (client: Client) => void;
}

interface ClientForm {
  client_type: ClientType;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  address_line: string;
  postal_code: string;
  city: string;
  country: string;
  vat: string;
  notes: string;
}

const blank: ClientForm = {
  client_type: 'particulier',
  first_name: '',
  last_name: '',
  company_name: '',
  email: '',
  phone: '',
  address_line: '',
  postal_code: '',
  city: '',
  country: 'BE',
  vat: '',
  notes: '',
};

export function ClientEditor({ client, onClose, onSaved }: Props) {
  const toast = useToast();
  const [f, setF] = useState<ClientForm>(() =>
    client
      ? {
          client_type: client.client_type ?? 'particulier',
          first_name: client.first_name ?? '',
          last_name: client.last_name ?? '',
          company_name: client.company_name ?? '',
          email: client.email ?? '',
          phone: client.phone ?? '',
          address_line: client.address_line ?? '',
          postal_code: client.postal_code ?? '',
          city: client.city ?? '',
          country: client.country || 'BE',
          vat: client.vat ?? '',
          notes: client.notes ?? '',
        }
      : { ...blank },
  );
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ClientForm>(k: K, v: ClientForm[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const isPro = f.client_type === 'professionnel';

  async function save() {
    const display = clientDisplayName(f);
    if (isPro && !f.company_name.trim()) return toast.error('La raison sociale est obligatoire.');
    if (!isPro && !f.last_name.trim()) return toast.error('Le nom est obligatoire.');

    setBusy(true);
    const payload = {
      client_type: f.client_type,
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      company_name: f.company_name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      address_line: f.address_line.trim(),
      postal_code: f.postal_code.trim(),
      city: f.city.trim(),
      country: f.country.trim() || 'BE',
      vat: f.vat.trim(),
      notes: f.notes.trim(),
      // libellés "plats" gardés synchro pour l'affichage / les factures / l'UBL
      name: display,
      address: [
        f.address_line.trim(),
        [f.postal_code.trim(), f.city.trim()].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    };

    const res = client
      ? await supabase.from('clients').update(payload).eq('id', client.id).select('*').single()
      : await supabase.from('clients').insert(payload).select('*').single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.ok(client ? 'Client mis à jour.' : 'Client ajouté.');
    onSaved?.(res.data as Client);
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
        <label>Type de client</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['particulier', 'professionnel'] as ClientType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={'btn btn--sm' + (f.client_type === t ? ' btn--primary' : '')}
              onClick={() => set('client_type', t)}
            >
              {t === 'particulier' ? 'Particulier' : 'Professionnel'}
            </button>
          ))}
        </div>
      </div>

      {isPro ? (
        <div className="field">
          <label>Raison sociale</label>
          <input value={f.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </div>
      ) : null}

      <div className="field-row">
        <div className="field">
          <label>Prénom{isPro ? ' (contact)' : ''}</label>
          <input value={f.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </div>
        <div className="field">
          <label>Nom{isPro ? ' (contact)' : ''}</label>
          <input value={f.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Email</label>
          <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          <div className="hint">Utilisé pour les emails automatiques de suivi de commande.</div>
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Rue et numéro</label>
        <input value={f.address_line} onChange={(e) => set('address_line', e.target.value)} />
      </div>
      <div className="field-row field-row--3">
        <div className="field">
          <label>Code postal</label>
          <input value={f.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
        </div>
        <div className="field">
          <label>Ville</label>
          <input value={f.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="field">
          <label>Pays</label>
          <input value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="BE" />
        </div>
      </div>

      <div className="field">
        <label>N° de TVA {isPro ? '' : '(si applicable)'}</label>
        <input value={f.vat} onChange={(e) => set('vat', e.target.value)} placeholder="BE0123456789" />
      </div>
      <div className="field">
        <label>Notes</label>
        <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  );
}
