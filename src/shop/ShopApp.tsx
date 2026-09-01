import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CartProvider } from './cart';
import { ShopLayout } from './ShopLayout';
import { ShopHome } from './ShopHome';
import { ShopProduct } from './ShopProduct';
import { ShopCart } from './ShopCart';
import { ShopCheckout } from './ShopCheckout';
import { ShopConfirm } from './ShopConfirm';
import { ShopLegal } from './ShopLegal';
import './shop.css';

export function ShopApp() {
  return (
    <ErrorBoundary label="Boutique">
      <CartProvider>
        <ShopLayout>
          <ErrorBoundary label="Page boutique">
            <Routes>
              <Route path="/" element={<ShopHome />} />
              <Route path="/produit/:id" element={<ShopProduct />} />
              <Route path="/panier" element={<ShopCart />} />
              <Route path="/commander" element={<ShopCheckout />} />
              <Route path="/commande-confirmee" element={<ShopConfirm />} />
              <Route path="/:slug" element={<ShopLegal />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </ShopLayout>
      </CartProvider>
    </ErrorBoundary>
  );
}
