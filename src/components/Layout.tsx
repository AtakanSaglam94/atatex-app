import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Icon } from './Icon';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard' as const, end: true },
  { to: '/commandes', label: 'Commandes', icon: 'orders' as const },
  { to: '/stock', label: 'Stock', icon: 'stock' as const },
  { to: '/clients', label: 'Clients', icon: 'clients' as const },
  { to: '/catalogue', label: 'Catalogue', icon: 'catalog' as const },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' as const },
  { to: '/factures', label: 'Factures', icon: 'invoices' as const },
];

type ThemeChoice = 'system' | 'light' | 'dark';

function useTheme(): [ThemeChoice, (t: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(
    () => (localStorage.getItem('atatex-theme') as ThemeChoice) || 'system',
  );
  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    localStorage.setItem('atatex-theme', choice);
  }, [choice]);
  return [choice, setChoice];
}

export function Layout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useTheme();

  const nav = isAdmin
    ? [
        ...NAV,
        { to: '/comptabilite', label: 'Comptabilité', icon: 'chart' as const },
        { to: '/reglages', label: 'Réglages', icon: 'settings' as const },
      ]
    : NAV;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__mark" aria-hidden>
            <Logo size={22} />
          </div>
          <div>
            <div className="sidebar__name">ATA-TEX</div>
            <div className="sidebar__sub">Gestion</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                'navbtn' + (isActive || location.pathname.startsWith(item.to + '/') ? ' navbtn--active' : '')
              }
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button
            className="navbtn"
            onClick={() =>
              setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
            }
            title="Changer le thème"
          >
            <Icon name="moon" size={18} />
            <span>
              Thème : {theme === 'system' ? 'auto' : theme === 'dark' ? 'sombre' : 'clair'}
            </span>
          </button>
          <div className="sidebar__user">
            <span className="mono">{profile?.full_name || 'Utilisateur'}</span>
            <span className="badge badge--neutral">{isAdmin ? 'Admin' : 'Travailleur'}</span>
          </div>
          <button className="navbtn" onClick={signOut}>
            <Icon name="logout" size={18} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      <div className="topbar">
        <div className="sidebar__mark" aria-hidden>
          <Logo size={22} />
        </div>
        <span className="sidebar__name">ATA-TEX</span>
        <span className="badge badge--neutral">{isAdmin ? 'Admin' : 'Travailleur'}</span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn--ghost btn--sm"
          onClick={() =>
            setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
          }
          aria-label="Changer le thème"
        >
          <Icon name="moon" size={17} />
        </button>
        <button className="btn btn--ghost btn--sm" onClick={signOut} aria-label="Se déconnecter">
          <Icon name="logout" size={17} />
        </button>
      </div>

      <main className="main">{children}</main>

      <style>{layoutCss}</style>
    </div>
  );
}

const layoutCss = `
.layout { display: flex; min-height: 100%; }
.sidebar {
  width: 232px; flex-shrink: 0; background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column; padding: 18px 12px;
  position: sticky; top: 0; height: 100vh;
}
.sidebar__brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 16px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
.sidebar__mark { width: 32px; height: 32px; border-radius: 9px; background: var(--accent); color: var(--on-accent); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 600; font-size: 17px; }
.sidebar__name { font-family: var(--font-display); font-size: 17px; font-weight: 600; }
.sidebar__sub { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.sidebar__nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.navbtn {
  display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: var(--radius-sm);
  background: none; border: none; color: var(--ink-soft); text-align: left; font-size: 14px; font-weight: 500;
  cursor: pointer; width: 100%; text-decoration: none;
}
.navbtn:hover { background: var(--surface-2); color: var(--ink); }
.navbtn--active { background: var(--accent-weak); color: var(--accent); }
.sidebar__foot { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
.sidebar__user { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 12.5px; color: var(--ink-soft); }
.main { flex: 1; min-width: 0; padding: 26px clamp(16px, 4vw, 36px) 90px; max-width: 1180px; }
.topbar { display: none; }

@media (max-width: 860px) {
  .layout { flex-direction: column; }
  .topbar {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: var(--surface); border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 40;
  }
  .topbar .sidebar__name { font-size: 15px; }
  .sidebar {
    width: 100%; height: auto; position: fixed; bottom: 0; top: auto; z-index: 50;
    flex-direction: row; padding: 6px; border-right: none; border-top: 1px solid var(--line);
    box-shadow: var(--shadow-md);
  }
  .sidebar__brand, .sidebar__foot { display: none; }
  .sidebar__nav { flex-direction: row; justify-content: space-around; width: 100%; gap: 0; }
  .navbtn { flex-direction: column; gap: 3px; padding: 7px 4px; font-size: 10.5px; text-align: center; }
  .navbtn span { font-size: 10px; }
  .main { padding: 20px 14px 96px; }
}
`;
