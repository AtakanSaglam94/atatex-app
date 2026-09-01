import { useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { eur, num } from '@/lib/money';
import type { ConfectionType } from '@/types';

export function ConfectionTypesPanel() {
  const { confectionTypes } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<ConfectionType | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ConfectionType | null>(null);

  async function remove(t: ConfectionType) {
    const { error } = await supabase.from('confection_types').delete().eq('id', t.id);
    setDeleting(null);
    if (error) toast.error(error.message + ' — désactivez-le plutôt s\'il est utilisé.');
    else toast.ok('Type supprimé.');
  }

  return (
    <>
      <Panel
        title="Types de confection"
        action={
          <button className="btn btn--sm btn--primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={15} /> Ajouter
          </button>
        }
      >
        <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          m à commander = <b>largeur × facteur + marge</b> · prix TTC = (prix tissu TTC + frais catégorie) × m
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th style={{ textAlign: 'right' }}>Facteur</th>
                <th style={{ textAlign: 'right' }}>Marge (m)</th>
                <th style={{ textAlign: 'right' }}>Frais rid./voil.</th>
                <th style={{ textAlign: 'right' }}>Frais tenture</th>
                <th style={{ textAlign: 'right' }}>Largeur min/max</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {confectionTypes.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => setEditing(t)} style={t.active ? undefined : { opacity: 0.5 }}>
                  <td>
                    {t.nom}
                    {!t.active && <span className="badge badge--neutral" style={{ marginLeft: 6 }}>inactif</span>}
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>{num(t.facteur, 0, 3)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{num(t.marge_fixe, 2, 3)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{eur(t.frais_rideau_voilage)}/m</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{eur(t.frais_tenture)}/m</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {t.largeur_min ?? '—'} / {t.largeur_max ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(t);
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
      </Panel>

      {editing && (
        <ConfectionTypeEditor
          type={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le type"
          message={`Supprimer « ${deleting.nom} » ? Les commandes déjà passées ne changent pas.`}
          danger
          confirmLabel="Supprimer"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function ConfectionTypeEditor({ type, onClose }: { type: ConfectionType | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(() => ({
    nom: type?.nom ?? '',
    facteur: type?.facteur ?? 2,
    marge_fixe: type?.marge_fixe ?? 0.2,
    frais_rideau_voilage: type?.frais_rideau_voilage ?? 0,
    frais_tenture: type?.frais_tenture ?? 0,
    largeur_min: (type?.largeur_min ?? '') as number | '',
    largeur_max: (type?.largeur_max ?? '') as number | '',
    active: type?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const setNum = (k: 'facteur' | 'marge_fixe' | 'frais_rideau_voilage' | 'frais_tenture', v: string) =>
    setF((s) => ({ ...s, [k]: parseFloat(v) || 0 }));
  const setLim = (k: 'largeur_min' | 'largeur_max', v: string) =>
    setF((s) => ({ ...s, [k]: v === '' ? '' : parseFloat(v) || 0 }));

  async function save() {
    if (!f.nom.trim()) return toast.error('Le nom est obligatoire.');
    if (f.facteur <= 0) return toast.error('Le facteur doit être supérieur à 0.');
    setBusy(true);
    const payload = {
      nom: f.nom,
      facteur: f.facteur,
      marge_fixe: f.marge_fixe,
      frais_rideau_voilage: f.frais_rideau_voilage,
      frais_tenture: f.frais_tenture,
      largeur_min: f.largeur_min === '' ? null : f.largeur_min,
      largeur_max: f.largeur_max === '' ? null : f.largeur_max,
      active: f.active,
    };
    const { error } = type
      ? await supabase.from('confection_types').update(payload).eq('id', type.id)
      : await supabase.from('confection_types').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.ok(type ? 'Type mis à jour.' : 'Type ajouté.');
    onClose();
  }

  return (
    <Modal
      title={type ? 'Modifier le type' : 'Nouveau type de confection'}
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
        <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Froncé, Wave 6cm, Store…" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Facteur (× largeur)</label>
          <input type="number" step="0.1" min={0} value={f.facteur} onChange={(e) => setNum('facteur', e.target.value)} />
        </div>
        <div className="field">
          <label>Marge fixe (m)</label>
          <input type="number" step="0.01" min={0} value={f.marge_fixe} onChange={(e) => setNum('marge_fixe', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Frais confection TTC — rideau / voilage (€/m)</label>
          <input type="number" step="0.5" min={0} value={f.frais_rideau_voilage} onChange={(e) => setNum('frais_rideau_voilage', e.target.value)} />
        </div>
        <div className="field">
          <label>Frais confection TTC — tenture (€/m)</label>
          <input type="number" step="0.5" min={0} value={f.frais_tenture} onChange={(e) => setNum('frais_tenture', e.target.value)} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Largeur minimum (m) — optionnel</label>
          <input type="number" step="0.01" min={0} placeholder="Aucune" value={f.largeur_min} onChange={(e) => setLim('largeur_min', e.target.value)} />
        </div>
        <div className="field">
          <label>Largeur maximum (m) — optionnel</label>
          <input type="number" step="0.01" min={0} placeholder="Aucune" value={f.largeur_max} onChange={(e) => setLim('largeur_max', e.target.value)} />
          <div className="hint">Peut être surchargée par catégorie de produit (voir Catégories).</div>
        </div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        Actif (proposé lors de la création d'une commande)
      </label>
    </Modal>
  );
}
