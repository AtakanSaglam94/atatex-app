import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eur } from '@/lib/money';
import { UNIT_LABEL } from '@/lib/format';
import { useShopCatalog, productPhotos } from './useShopCatalog';

export function ShopHome() {
  const { loading, error, products, categories } = useShopCatalog();
  const [cat, setCat] = useState<string | 'all'>('all');

  const usedCats = useMemo(() => {
    const ids = new Set(products.map((p) => p.category_id).filter(Boolean));
    return categories.filter((c) => ids.has(c.id));
  }, [products, categories]);

  const visible = useMemo(
    () => (cat === 'all' ? products : products.filter((p) => p.category_id === cat)),
    [products, cat],
  );

  return (
    <>
      <section className="shop-hero">
        <h1>Rideaux, voilages & tentures sur mesure</h1>
        <p>
          Atelier bruxellois de confection. Choisissez vos tissus en ligne, retirez au
          marché ou faites-vous livrer.
        </p>
      </section>

      {usedCats.length > 0 && (
        <div className="shop-filters">
          <button
            className={'shop-chip' + (cat === 'all' ? ' shop-chip--on' : '')}
            onClick={() => setCat('all')}
          >
            Tout
          </button>
          {usedCats.map((c) => (
            <button
              key={c.id}
              className={'shop-chip' + (cat === c.id ? ' shop-chip--on' : '')}
              onClick={() => setCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--ink-faint)' }}>Chargement du catalogue…</p>
      ) : error ? (
        <div className="shop-notice">Catalogue momentanément indisponible. Réessayez plus tard.</div>
      ) : visible.length === 0 ? (
        <div className="shop-notice">Aucun article en ligne pour le moment.</div>
      ) : (
        <div className="shop-grid">
          {visible.map((p) => {
            const pic = productPhotos(p)[0];
            return (
              <Link key={p.id} to={`/produit/${p.id}`} className="shop-card">
                <div
                  className="shop-card__img"
                  style={pic ? { backgroundImage: `url(${pic})` } : undefined}
                >
                  {!pic && 'ATA-TEX'}
                </div>
                <div className="shop-card__body">
                  <span className="shop-card__name">{p.name}</span>
                  {p.confection_category && (
                    <span className="shop-card__meta">Confection sur mesure</span>
                  )}
                  <span className="shop-card__price">
                    {eur(p.price)}
                    <span className="shop-card__meta"> / {UNIT_LABEL[p.unit]}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
