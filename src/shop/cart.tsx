import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProductUnit } from '@/types';

export interface CartLine {
  /** identifiant unique de la configuration (produit + options de confection) */
  key: string;
  product_id: string;
  name: string;
  unit: ProductUnit;
  /** prix unitaire TTC (par pièce, ou par mètre pour la confection) */
  unit_price: number;
  qty: number;
  /** total de ligne TTC — prioritaire sur unit_price×qty (évite les écarts d'arrondi confection) */
  line_total?: number;
  photo?: string;
  is_confection?: boolean;
  confection_type_id?: string;
  confection_type_label?: string;
  largeur?: number;
  hauteur?: number;
  /** métrage de tissu (= qty quand is_confection) */
  metrage?: number;
}

const STORAGE_KEY = 'atatex-shop-cart';

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, 'key'> & { key?: string }) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartState | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [lines]);

  const add: CartState['add'] = useCallback((line) => {
    const key = line.key ?? `${line.product_id}${line.is_confection ? `-${line.confection_type_id}-${line.largeur}-${line.hauteur}` : ''}`;
    setLines((prev) => {
      const i = prev.findIndex((l) => l.key === key);
      if (i >= 0) {
        const next = [...prev];
        const qty = next[i].qty + line.qty;
        next[i] = {
          ...next[i],
          qty,
          line_total: next[i].is_confection
            ? (next[i].line_total ?? 0) + (line.line_total ?? line.unit_price * line.qty)
            : undefined,
        };
        return next;
      }
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) =>
            l.key === key
              ? {
                  ...l,
                  qty,
                  line_total:
                    l.is_confection && l.line_total != null
                      ? (l.line_total / l.qty) * qty
                      : undefined,
                }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((s, l) => s + (l.is_confection ? 1 : l.qty), 0);
    const subtotal =
      Math.round(
        lines.reduce((s, l) => s + (l.line_total ?? l.unit_price * l.qty), 0) * 100,
      ) / 100;
    return { lines, count, subtotal, add, setQty, remove, clear };
  }, [lines, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
