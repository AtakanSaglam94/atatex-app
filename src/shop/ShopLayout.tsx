import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useCart } from './cart';

export function ShopLayout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  return (
    <div className="shop">
      <header className="shop-header">
        <Link to="/" className="shop-brand">
          <Logo size={30} />
          ATA-TEX
        </Link>
        <nav className="shop-nav">
          <Link to="/">Boutique</Link>
          <Link to="/panier" className="shop-cart-btn">
            Panier
            {count > 0 && <span className="shop-cart-badge">{count}</span>}
          </Link>
        </nav>
      </header>

      <main className="shop-main">{children}</main>

      <footer className="shop-footer">
        ATA-TEX — Rideaux, voilages, tentures &amp; confection sur mesure · Bruxelles
        <br />
        <a href="mailto:commande@ata-tex.be">commande@ata-tex.be</a>
        <br />
        <Link to="/cgv">CGV</Link> · <Link to="/mentions-legales">Mentions légales</Link> ·{' '}
        <Link to="/confidentialite">Confidentialité</Link> ·{' '}
        <Link to="/retractation">Rétractation</Link>
      </footer>
    </div>
  );
}
