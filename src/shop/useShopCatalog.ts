import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConfectionType, Product, ProductCategory } from '@/types';

interface Catalog {
  loading: boolean;
  error: string | null;
  products: Product[];
  categories: ProductCategory[];
  confectionTypes: ConfectionType[];
}

/** Charge la vitrine publique (produits publiés, catégories, types de confection). */
export function useShopCatalog(): Catalog {
  const [state, setState] = useState<Catalog>({
    loading: true,
    error: null,
    products: [],
    categories: [],
    confectionTypes: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, c, t] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('published_online', true)
          .eq('active', true)
          .order('name'),
        supabase.from('product_categories').select('*').order('position').order('name'),
        supabase.from('confection_types').select('*').eq('active', true).order('position'),
      ]);
      if (!alive) return;
      const err = p.error?.message ?? c.error?.message ?? t.error?.message ?? null;
      setState({
        loading: false,
        error: err,
        products: (p.data as Product[]) ?? [],
        categories: (c.data as ProductCategory[]) ?? [],
        confectionTypes: (t.data as ConfectionType[]) ?? [],
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function productPhotos(p: Product): string[] {
  return p.photo_urls?.length ? p.photo_urls : p.photo_url ? [p.photo_url] : [];
}
