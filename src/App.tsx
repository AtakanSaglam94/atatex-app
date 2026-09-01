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
import { ShopApp } from './shop/ShopApp';

/**
 * La boutique publique (ata-tex.be) et l'app de gestion partagent le même
 * déploiement. On aiguille selon le domaine — ou `?boutique` pour tester
 * la boutique avant que le DNS ne pointe.
 */
function isShopHost(): boolean {
  const h = window.location.hostname;
  if (h === 'ata-tex.be' || h === 'www.ata-tex.be' || h.startsWith('boutique.')) return true;
  return new URLSearchParams(window.location.search).has('boutique');
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
  if (isShopHost()) return <ShopApp />;
  return (
    <ErrorBoundary label="Application">
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
