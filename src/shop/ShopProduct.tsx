import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eur } from '@/lib/money';
import { UNIT_LABEL } from '@/lib/format';
import { useShopCatalog, productPhotos } from './useShopCatalog';
import { useCart } from './cart';
import { ConfectionConfigurator } from './ConfectionConfigurator';

export function ShopProduct() {
  const { id } = useParams();
  const nav = useNavigate();
  const { loading, products, categories, confectionTypes } = useShopCatalog();
  const { add } = useCart();

  const product = useMemo(() => products.find((p) => p.id === id) ?? null, [products, id]);
  const categoryLargeurMax =
    categories.find((c) => c.id === product?.category_id)?.largeur_max ?? null;
  const photos = product ? productPhotos(product) : [];
  const [pi, setPi] = useState(0);
  const [qty, setQty] = useState(1);

  if (loading) return <p style={{ color: 'var(--ink-faint)' }}>Chargement…</p>;
  if (!product)
    return (
      <div className="shop-notice">
        Article introuvable. <Link to="/">Retour à la boutique</Link>
      </div>
    );

  const isConfection = !!product.confection_category;

  function addToCart() {
    if (!product || isConfection) return;
    add({
      product_id: product.id,
      name: product.name,
      unit: product.unit,
      unit_price: product.price,
      qty,
      photo: photos[0],
    });
    nav('/panier');
  }

  return (
    <div className="shop-product">
      <div>
        <img
          className="shop-gallery__main"
          src={photos[pi]}
          alt={product.name}
          style={!photos.length ? { objectFit: 'contain' } : undefined}
        />
        {photos.length > 1 && (
          <div className="shop-gallery__thumbs">
            {photos.map((u, i) => (
              <img
                key={u}
                src={u}
                alt=""
                className={i === pi ? 'on' : undefined}
                onClick={() => setPi(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <Link to="/" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          ← Boutique
        </Link>
        <h1>{product.name}</h1>
        <div className="shop-product__price">
          {eur(product.price)}{' '}
          <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
            / {UNIT_LABEL[product.unit]} · TVA comprise
          </span>
        </div>

        {product.online_description && (
          <p className="shop-product__desc">{product.online_description}</p>
        )}

        {isConfection ? (
          <ConfectionConfigurator
            product={product}
            confectionTypes={confectionTypes}
            categoryLargeurMax={categoryLargeurMax}
            photo={photos[0]}
          />
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <div className="shop-qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">
                −
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Plus">
                +
              </button>
            </div>
            <button className="btn btn--primary" onClick={addToCart}>
              Ajouter au panier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
