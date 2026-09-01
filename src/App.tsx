import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { DataProvider, useData } from './data/DataProvider';
import { Layout } from './components/Layout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { StockPage } from './features/stock/StockPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { AgendaPage } from './features/agenda/AgendaPage';
import { InvoicesPage } from './features/invoices/InvoicesPage';
import { AccountingPage } from './features/accounting/AccountingPage';
import { SettingsPage } from './features/settings/SettingsPage';

function Shell() {
  const { session, loading } = useAuth();

  if (loading) return <div className="spinner-page">Chargement…</div>;
  if (!session) return <LoginPage />;

  return (
    <DataProvider>
      <Gate />
    </DataProvider>
  );
}

function Gate() {
  const { loading } = useData();
  const { isAdmin } = useAuth();
  if (loading) return <div className="spinner-page">Chargement des données…</div>;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/commandes" element={<OrdersPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/catalogue" element={<CatalogPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/factures" element={<InvoicesPage />} />
        <Route
          path="/comptabilite"
          element={isAdmin ? <AccountingPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/reglages/*"
          element={isAdmin ? <SettingsPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
