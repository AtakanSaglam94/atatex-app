import { useMemo, useState } from 'react';
import { PageHeader, SearchInput, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { useData } from '@/data/DataProvider';
import { eur } from '@/lib/money';
import { UNIT_LABEL, CONFECTION_CATEGORY_LABEL } from '@/lib/format';
import type { Product } from '@/types';

function photosOf(p: Product): string[] {
  return p.photo_urls?.length ? p.photo_urls : p.photo_url ? [p.photo_url] : [];
}

function Gallery({ product, onClose }: { product: Product; onClose: () => void }) {
  const photos = photosOf(product);
  const [i, setI] = useState(0);
  return (
    <Modal title={product.name} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <img
          src={photos[i]}
          alt={product.name}
          style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }}
        />
        {photos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn--sm" onClick={() => setI((i + photos.length - 1) % photos.length)}>
              ‹
            </button>
            <span className="mono" style={{ fontSize: 13 }}>
              {i + 1} / {photos.length}
            </span>
            <button className="btn btn--sm" onClick={() => setI((i + 1) % photos.length)}>
              ›
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Vue catalogue — pensée pour la tablette en boutique / au marché :
 * grille visuelle groupée par catégorie, à montrer aux clients.
 */
export function CatalogPage() {
  const { products, categories } = useData();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | 'all'>('all');
  const [gallery, setGallery] = useState<Product | null>(null);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products
      .filter((p) => p.active)
      .filter((p) => activeCat === 'all' || p.category_id === activeCat)
      .filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [products, search, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const cat of categories) map.set(cat.id, []);
    map.set('__none', []);
    for (const p of visible) {
      const k = p.category_id && map.has(p.category_id) ? p.category_id : '__none';
      map.get(k)!.push(p);
    }
    return map;
  }, [visible, categories]);

  return (
    <>
      <PageHeader title="Catalogue" subtitle="Aperçu visuel à présenter aux clients" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un modèle…" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={'btn btn--sm' + (activeCat === 'all' ? ' btn--primary' : '')}
            onClick={() => setActiveCat('all')}
          >
            Tout
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={'btn btn--sm' + (activeCat === c.id ? ' btn--primary' : '')}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState message="Aucun produit dans le catalogue." />
      ) : (
        [
          ...categories,
          { id: '__none', name: 'Sans catégorie', position: 999, largeur_max: null, created_at: '' },
        ]
          .filter((cat) => (grouped.get(cat.id)?.length ?? 0) > 0)
          .map((cat) => (
            <section key={cat.id} style={{ marginBottom: 26 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>{cat.name}</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: 12,
                }}
              >
                {grouped.get(cat.id)!.map((p) => {
                  const pics = photosOf(p);
                  return (
                  <div key={p.id} className="card" style={{ padding: 12 }}>
                    <button
                      type="button"
                      onClick={() => pics.length && setGallery(p)}
                      style={{
                        position: 'relative',
                        height: 110,
                        width: '100%',
                        borderRadius: 6,
                        marginBottom: 10,
                        border: 'none',
                        padding: 0,
                        background: pics[0]
                          ? `center/cover no-repeat url(${pics[0]})`
                          : 'var(--accent-weak)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                        cursor: pics.length ? 'zoom-in' : 'default',
                      }}
                    >
                      {!pics.length && <Icon name="catalog" size={26} />}
                      {pics.length > 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            background: 'rgba(20,16,12,0.7)',
                            color: '#fff',
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 999,
                          }}
                        >
                          {pics.length} photos
                        </span>
                      )}
                    </button>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    {p.confection_category && (
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {CONFECTION_CATEGORY_LABEL[p.confection_category]}
                      </div>
                    )}
                    <div className="mono" style={{ fontSize: 14, marginTop: 8 }}>
                      {eur(p.price)}/{UNIT_LABEL[p.unit]}
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>
                      <span
                        className={`badge badge--${p.stock <= p.low_stock_at ? 'low' : 'neutral'}`}
                      >
                        {p.stock} {p.unit === 'm' ? 'm' : 'pce'} en stock
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>
          ))
      )}

      {gallery && <Gallery product={gallery} onClose={() => setGallery(null)} />}
    </>
  );
}
