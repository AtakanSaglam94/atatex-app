import { useState } from 'react';
import { PageHeader } from '@/components/ui';
import { CompanyPanel } from './CompanyPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { ConfectionTypesPanel } from './ConfectionTypesPanel';
import { ServicesPanel } from './ServicesPanel';
import { PickupPointsPanel } from './PickupPointsPanel';
import { EmailTemplatesPanel } from './EmailTemplatesPanel';
import { UsersPanel } from './UsersPanel';

const TABS = [
  { key: 'entreprise', label: 'Entreprise', el: <CompanyPanel /> },
  { key: 'categories', label: 'Catégories', el: <CategoriesPanel /> },
  { key: 'confection', label: 'Types de confection', el: <ConfectionTypesPanel /> },
  { key: 'services', label: 'Services', el: <ServicesPanel /> },
  { key: 'retrait', label: 'Points de retrait', el: <PickupPointsPanel /> },
  { key: 'emails', label: 'Emails', el: <EmailTemplatesPanel /> },
  { key: 'utilisateurs', label: 'Utilisateurs', el: <UsersPanel /> },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('entreprise');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <PageHeader title="Réglages" subtitle="Configuration de l'application" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'btn btn--sm' + (tab === t.key ? ' btn--primary' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active.el}
    </>
  );
}
