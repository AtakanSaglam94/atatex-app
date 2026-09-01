import { Link } from 'react-router-dom';
import { eur } from '@/lib/money';
import { useCart } from './cart';

export function ShopCart() {
  const { lines, subtotal, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <div className="shop-notice">
        Votre panier est vide. <Link to="/">Voir la boutique</Link>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 6 }}>Panier</h1>

      <div>
        {lines.map((l) => (
          <div key={l.key} className="shop-cart-line">
            {l.photo ? <img src={l.photo} alt="" /> : <div className="shop-cart-line" style={{ padding: 0 }} />}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
              {l.is_confection ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                  {l.confection_type_label} · {l.largeur} m
                  {l.hauteur ? ` × ${l.hauteur} m` : ''} · {l.metrage} m de tissu
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                  {eur(l.unit_price)} l’unité
                </div>
              )}
              {!l.is_confection && (
                <div className="shop-qty" style={{ marginTop: 6 }}>
                  <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Moins">
                    −
                  </button>
                  <span>{l.qty}</span>
                  <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Plus">
                    +
                  </button>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 14 }}>
                {eur(l.line_total ?? l.unit_price * l.qty)}
              </div>
              <button
                onClick={() => remove(l.key)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--ink-faint)',
                  fontSize: 12,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="shop-cart-totals">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Sous-total (TVA comprise)</span>
          <span className="mono">{eur(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-faint)', fontSize: 13 }}>
          <span>Livraison</span>
          <span>calculée à l’étape suivante</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="grand">
          <span>Total</span>
          <span className="mono">{eur(subtotal)}</span>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/" className="btn">
          Continuer mes achats
        </Link>
        <button className="btn btn--primary" disabled title="Disponible bientôt">
          Passer la commande
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 10 }}>
        Le paiement en ligne (Bancontact) et le choix de livraison arrivent à la
        prochaine étape du déploiement.
      </p>
    </>
  );
}
