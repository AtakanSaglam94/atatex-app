import { useState } from 'react';
import { Panel } from '@/components/ui';
import { useData } from '@/data/DataProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { EmailTemplate } from '@/types';

export function EmailTemplatesPanel() {
  const { emailTemplates } = useData();

  return (
    <Panel title="Modèles d'emails" padded>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 0 }}>
        Un email part automatiquement au client (adresse de sa fiche) à chaque changement de statut.
        Variables : <code>{'{client}'}</code>, <code>{'{numero}'}</code>, <code>{'{entreprise}'}</code>,{' '}
        <code>{'{point}'}</code>, <code>{'{jour}'}</code> (point de retrait).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {emailTemplates.map((t) => (
          <TemplateRow key={t.template_key} tpl={t} />
        ))}
      </div>
    </Panel>
  );
}

function TemplateRow({ tpl }: { tpl: EmailTemplate }) {
  const toast = useToast();
  const [f, setF] = useState({ subject: tpl.subject, body: tpl.body, enabled: tpl.enabled });
  const [busy, setBusy] = useState(false);
  const dirty = f.subject !== tpl.subject || f.body !== tpl.body || f.enabled !== tpl.enabled;

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from('email_templates')
      .update({ subject: f.subject, body: f.body, enabled: f.enabled })
      .eq('template_key', tpl.template_key);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.ok('Modèle enregistré.');
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{tpl.label}</strong>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={f.enabled}
            onChange={(e) => setF({ ...f, enabled: e.target.checked })}
          />
          Actif
        </label>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Objet</label>
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Message</label>
        <textarea
          rows={5}
          value={f.body}
          onChange={(e) => setF({ ...f, body: e.target.value })}
        />
      </div>
      <button className="btn btn--sm btn--primary" onClick={save} disabled={busy || !dirty}>
        {busy ? 'Enregistrement…' : 'Enregistrer ce modèle'}
      </button>
    </div>
  );
}
