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
    google_review_url: company?.google_review_url ?? '',
    website_url: company?.website_url ?? '',
    shipping_fee_home: company?.shipping_fee_home ?? 0,
    free_shipping_threshold:
      company?.free_shipping_threshold == null ? '' : company.free_shipping_threshold,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    const payload = {
      ...f,
      shipping_fee_home: Number(f.shipping_fee_home) || 0,
      free_shipping_threshold:
        f.free_shipping_threshold === '' ? null : Number(f.free_shipping_threshold) || null,
    };
    const { error } = await supabase.from('company').update(payload).eq('id', 1);
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
      <div className="field-row">
        <div className="field">
          <label>Lien avis Google</label>
          <input
            value={f.google_review_url}
            onChange={(e) => set('google_review_url', e.target.value)}
            placeholder="https://g.page/r/…/review"
          />
          <div className="hint">Utilisé dans l'email d'avis envoyé 7 jours après « Terminé ».</div>
        </div>
        <div className="field">
          <label>Site web</label>
          <input
            value={f.website_url}
            onChange={(e) => set('website_url', e.target.value)}
            placeholder="https://ata-tex.be"
          />
        </div>
      </div>
      <h3 style={{ fontSize: 14, margin: '20px 0 4px' }}>Boutique en ligne — livraison</h3>
      <div className="field-row">
        <div className="field">
          <label>Frais de livraison à domicile (€ TTC)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={f.shipping_fee_home}
            onChange={(e) => set('shipping_fee_home', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="field">
          <label>Livraison offerte à partir de (€ TTC)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            placeholder="Jamais"
            value={f.free_shipping_threshold}
            onChange={(e) =>
              set('free_shipping_threshold', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
            }
          />
          <div className="hint">Laisser vide pour ne jamais offrir la livraison.</div>
        </div>
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
