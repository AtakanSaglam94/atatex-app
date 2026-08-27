import { useState } from 'react';
import { Panel } from '@/components/ui';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

export function CompanyPanel() {
  const { company } = useData();
  const toast = useToast();
  const [f, setF] = useState(() => ({
    name: company?.name ?? '',
    legal_form: company?.legal_form ?? '',
    vat: company?.vat ?? '',
    address: company?.address ?? '',
    iban: company?.iban ?? '',
    email: company?.email ?? '',
    phone: company?.phone ?? '',
    vat_rate: company?.vat_rate ?? 21,
    invoice_terms: company?.invoice_terms ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    const { error } = await supabase.from('company').update({ ...f }).eq('id', 1);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.ok('Informations enregistrées.');
  }

  return (
    <Panel title="Mon entreprise" padded>
      <div className="field">
        <label>Nom</label>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Forme juridique</label>
          <input value={f.legal_form} onChange={(e) => set('legal_form', e.target.value)} placeholder="SRL, indépendant…" />
        </div>
        <div className="field">
          <label>N° de TVA</label>
          <input value={f.vat} onChange={(e) => set('vat', e.target.value)} placeholder="BE0123456789" />
        </div>
      </div>
      <div className="field">
        <label>Adresse</label>
        <textarea value={f.address} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>IBAN</label>
          <input value={f.iban} onChange={(e) => set('iban', e.target.value)} placeholder="BE00 0000 0000 0000" />
        </div>
        <div className="field">
          <label>Taux de TVA (%)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            value={f.vat_rate}
            onChange={(e) => set('vat_rate', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email de facturation</label>
          <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Mention de paiement (bas de facture)</label>
        <input value={f.invoice_terms} onChange={(e) => set('invoice_terms', e.target.value)} />
      </div>
      <button className="btn btn--primary" onClick={save} disabled={busy}>
        {busy ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 12 }}>
        Ces informations apparaissent sur les factures PDF et dans l'export UBL / Peppol.
      </p>
    </Panel>
  );
}
