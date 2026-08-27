import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export function UsersPanel() {
  const { session } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setProfiles((data as Profile[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function setRole(p: Profile, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id);
    if (error) toast.error(error.message);
    else {
      toast.ok('Rôle mis à jour.');
      load();
    }
  }
  async function setActive(p: Profile, active: boolean) {
    const { error } = await supabase.from('profiles').update({ active }).eq('id', p.id);
    if (error) toast.error(error.message);
    else {
      toast.ok(active ? 'Compte réactivé.' : 'Compte désactivé.');
      load();
    }
  }

  return (
    <>
      <Panel
        title="Utilisateurs"
        action={
          <button className="btn btn--sm btn--primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={15} /> Nouveau compte
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th style={{ textAlign: 'right' }}>Actif</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.5 }}>
                  <td>{p.full_name || '(sans nom)'}</td>
                  <td>
                    <select
                      value={p.role}
                      disabled={p.id === session?.user.id}
                      onChange={(e) => setRole(p, e.target.value as UserRole)}
                    >
                      <option value="travailleur">Travailleur</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="checkbox"
                      checked={p.active}
                      disabled={p.id === session?.user.id}
                      onChange={(e) => setActive(p, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', padding: '10px 16px' }}>
          « Travailleur » : commandes, stock, clients, catalogue. « Admin » : tout, y compris le
          chiffre d'affaires et ces réglages.
        </p>
      </Panel>

      {adding && (
        <AddUser
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </>
  );
}

function AddUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'travailleur' as UserRole });
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!f.email.trim() || f.password.length < 8) {
      toast.error('Email valide et mot de passe d\'au moins 8 caractères requis.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: f });
    setBusy(false);
    if (error || (data && data.error)) {
      toast.error((data && data.error) || error?.message || 'Création impossible.');
      return;
    }
    toast.ok('Compte créé.');
    onCreated();
  }

  return (
    <Modal
      title="Nouveau compte utilisateur"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn--primary" onClick={create} disabled={busy}>
            {busy ? 'Création…' : 'Créer le compte'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Nom complet</label>
        <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <div className="field">
        <label>Mot de passe provisoire (8 caractères min.)</label>
        <input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </div>
      <div className="field">
        <label>Rôle</label>
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as UserRole })}>
          <option value="travailleur">Travailleur</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
        Nécessite le déploiement de la fonction <code>admin-create-user</code>. Sinon, créez les
        comptes depuis Supabase → Authentication → Users.
      </p>
    </Modal>
  );
}
