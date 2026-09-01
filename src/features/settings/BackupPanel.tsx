import { useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useToast } from '@/lib/toast';
import { exportAllData } from '@/lib/backup';

export function BackupPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [lastLocal, setLastLocal] = useState<string | null>(() =>
    localStorage.getItem('atatex-last-backup'),
  );

  async function run() {
    setBusy(true);
    try {
      const { rows } = await exportAllData();
      const now = new Date().toLocaleString('fr-BE');
      localStorage.setItem('atatex-last-backup', now);
      setLastLocal(now);
      toast.ok(`Sauvegarde téléchargée (${rows} enregistrements).`);
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Sauvegardes" padded>
      <p style={{ marginTop: 0, color: 'var(--ink-soft)', fontSize: 13.5 }}>
        Télécharge un instantané complet de toutes tes données (commandes, clients,
        produits, factures, réglages…) dans un seul fichier. À ranger sur ton
        ordinateur ou ton Drive.
      </p>

      <button className="btn btn--primary" onClick={run} disabled={busy}>
        <Icon name="download" size={16} />
        {busy ? ' Préparation…' : ' Télécharger une sauvegarde complète'}
      </button>

      {lastLocal && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 10 }}>
          Dernière sauvegarde depuis cet appareil : {lastLocal}
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          padding: '12px 14px',
          background: 'var(--warn-weak)',
          color: 'var(--warn)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12.5,
          lineHeight: 1.6,
        }}
      >
        <strong>Rythme conseillé</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>Une sauvegarde <strong>chaque semaine</strong> (mets-toi un rappel), gardée dans un dossier daté.</li>
          <li>Au minimum <strong>une par trimestre</strong> conservée à part (avant la déclaration TVA).</li>
          <li>Une copie sur un support différent (Drive + disque) une fois par mois.</li>
        </ul>
        <div style={{ marginTop: 6 }}>
          Une sauvegarde automatique hebdomadaire (sans action de ta part) peut être
          ajoutée — demande-le-moi quand tu veux.
        </div>
      </div>
    </Panel>
  );
}
