import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { DataProvider, useData } from './data/DataProvider';
import { OrdersProvider } from './data/useOrders';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { StockPage } from './features/stock/StockPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { AgendaPage } from './features/agenda/AgendaPage';
import { InvoicesPage } from './features/invoices/InvoicesPage';
import { AccountingPage } from './features/accounting/AccountingPage';
import { SettingsPage } from './features/settings/SettingsPage';

/**
 * L'app de gestion et la boutique publique sont deux builds séparés
 * (`dist/` vs `dist-shop/`) déployés sur deux sites Netlify distincts :
 * ce bundle ne contient AUCUN code de la boutique, et inversement.
 *
 * Garde-fou : si ce build se retrouve servi sur le domaine public
 * (mauvaise config DNS), on n'affiche rien d'exploitable.
 */
function isPublicDomain(): boolean {
  const h = window.location.hostname;
  return h === 'ata-tex.be' || h === 'www.ata-tex.be';
}

function Shell() {
  const { session, loading } = useAuth();

  if (loading) return <div className="spinner-page">Chargement…</div>;
  if (!session) return <LoginPage />;

  return (
    <DataProvider>
      <OrdersProvider>
        <Gate />
      </OrdersProvider>
    </DataProvider>
  );
}

function Gate() {
  const { loading } = useData();
  const { isAdmin } = useAuth();
  if (loading) return <div className="spinner-page">Chargement des données…</div>;

  const page = (label: string, node: ReactNode) => (
    <ErrorBoundary label={label} key={label}>
      {node}
    </ErrorBoundary>
  );

  return (
    <Layout>
      <Routes>
        <Route path="/" element={page('Tableau de bord', <DashboardPage />)} />
        <Route path="/commandes" element={page('Commandes', <OrdersPage />)} />
        <Route path="/stock" element={page('Stock', <StockPage />)} />
        <Route path="/clients" element={page('Clients', <ClientsPage />)} />
        <Route path="/catalogue" element={page('Catalogue', <CatalogPage />)} />
        <Route path="/agenda" element={page('Agenda', <AgendaPage />)} />
        <Route path="/factures" element={page('Factures', <InvoicesPage />)} />
        <Route
          path="/comptabilite"
          element={isAdmin ? page('Comptabilité', <AccountingPage />) : <Navigate to="/" replace />}
        />
        <Route
          path="/reglages/*"
          element={isAdmin ? page('Réglages', <SettingsPage />) : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  if (isPublicDomain()) {
    return (
      <div className="spinner-page" style={{ textAlign: 'center', padding: 40 }}>
        <p>
          Cette adresse est réservée à la boutique&nbsp;:{' '}
          <a href="https://ata-tex.be">ata-tex.be</a>
        </p>
      </div>
    );
  }
  return (
    <ErrorBoundary label="Application">
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
