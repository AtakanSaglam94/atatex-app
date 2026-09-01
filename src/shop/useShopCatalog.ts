import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConfectionType, PickupPoint, Product, ProductCategory } from '@/types';

export interface WebSettings {
  shipping_fee_home: number;
  free_shipping_threshold: number | null;
}

interface Catalog {
  loading: boolean;
  error: string | null;
  products: Product[];
  categories: ProductCategory[];
  confectionTypes: ConfectionType[];
  pickupPoints: PickupPoint[];
  settings: WebSettings;
}

/** Charge la vitrine publique (produits publiés, catégories, types de confection). */
export function useShopCatalog(): Catalog {
  const [state, setState] = useState<Catalog>({
    loading: true,
    error: null,
    products: [],
    categories: [],
    confectionTypes: [],
    pickupPoints: [],
    settings: { shipping_fee_home: 0, free_shipping_threshold: null },
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, c, t, pp, s] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('published_online', true)
          .eq('active', true)
          .order('name'),
        supabase.from('product_categories').select('*').order('position').order('name'),
        supabase.from('confection_types').select('*').eq('active', true).order('position'),
        supabase.from('pickup_points').select('*').eq('active', true).order('position'),
        supabase.from('web_settings').select('*').maybeSingle(),
      ]);
      if (!alive) return;
      const err = p.error?.message ?? c.error?.message ?? t.error?.message ?? null;
      setState({
        loading: false,
        error: err,
        products: (p.data as Product[]) ?? [],
        categories: (c.data as ProductCategory[]) ?? [],
        confectionTypes: (t.data as ConfectionType[]) ?? [],
        pickupPoints: (pp.data as PickupPoint[]) ?? [],
        settings:
          (s.data as WebSettings) ?? { shipping_fee_home: 0, free_shipping_threshold: null },
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
