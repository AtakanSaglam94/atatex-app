import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { exportAllData } from '@/lib/backup';
import { fmtDateTime } from '@/lib/format';

interface AutoFile {
  name: string;
  created: string;
  size: number;
}

export function BackupPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [lastLocal, setLastLocal] = useState<string | null>(() => {
    try {
      return localStorage.getItem('atatex-last-backup');
    } catch {
      return null;
    }
  });
  const [autoFiles, setAutoFiles] = useState<AutoFile[] | null>(null);

  useEffect(() => {
    supabase.storage
      .from('backups')
      .list('auto', { limit: 60, sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data }) => {
        if (!data) return setAutoFiles([]);
        setAutoFiles(
          data
            .filter((f) => f.name.endsWith('.json'))
            .map((f) => ({
              name: f.name,
              created: f.created_at ?? '',
              size: (f.metadata?.size as number) ?? 0,
            })),
        );
      })
      .catch(() => setAutoFiles([]));
  }, []);

  async function run() {
    setBusy(true);
    try {
      const { rows } = await exportAllData();
      const now = new Date().toLocaleString('fr-BE');
      try {
        localStorage.setItem('atatex-last-backup', now);
      } catch {
        /* ignore */
      }
      setLastLocal(now);
      toast.ok(`Sauvegarde téléchargée (${rows} enregistrements).`);
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function downloadAuto(name: string) {
    const { data, error } = await supabase.storage
      .from('backups')
      .createSignedUrl(`auto/${name}`, 120);
    if (error || !data) return toast.error(error?.message ?? 'Lien indisponible.');
    window.open(data.signedUrl, '_blank');
  }

  return (
    <Panel title="Sauvegardes" padded>
      <p style={{ marginTop: 0, color: 'var(--ink-soft)', fontSize: 13.5 }}>
        Télécharge un instantané complet de toutes tes données (commandes, clients,
        produits, factures, dépenses…) dans un seul fichier.
      </p>

      <button className="btn btn--primary" onClick={run} disabled={busy}>
        <Icon name="download" size={16} />
        {busy ? ' Préparation…' : ' Télécharger une sauvegarde complète'}
      </button>

      {lastLocal && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 10 }}>
          Dernière sauvegarde manuelle depuis cet appareil : {lastLocal}
        </div>
      )}

      <h3 style={{ fontSize: 14, margin: '22px 0 8px' }}>Sauvegardes automatiques (hebdomadaires)</h3>
      {autoFiles === null ? (
        <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Chargement…</div>
      ) : autoFiles.length === 0 ? (
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--warn)',
            background: 'var(--warn-weak)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            lineHeight: 1.6,
          }}
        >
          Pas encore de sauvegarde automatique. Pour l'activer (une seule fois) :
          <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>Lancer la migration <code>0010_backups.sql</code>.</li>
            <li>
              GitHub → dépôt <code>atatex-app</code> → Settings → Secrets and variables → Actions →
              ajouter <code>SUPABASE_URL</code> et <code>SUPABASE_SERVICE_KEY</code>.
            </li>
            <li>
              GitHub → onglet Actions → « Sauvegarde hebdomadaire » → Run workflow (test), puis
              elle tournera chaque lundi.
            </li>
          </ol>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <tbody>
              {autoFiles.map((f) => (
                <tr key={f.name}>
                  <td style={{ fontSize: 12.5 }}>
                    {f.created ? fmtDateTime(f.created) : f.name}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>
                    {(f.size / 1024).toFixed(0)} Ko
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => downloadAuto(f.name)}>
                      <Icon name="download" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 14 }}>
        Conseil : une fois par mois, télécharge une sauvegarde sur ton propre Drive
        (copie hors Supabase).
      </p>
    </Panel>
  );
}
