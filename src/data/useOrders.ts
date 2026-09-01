import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, OrderWithRelations, Client } from '@/types';

const SELECT = '*, client:clients(*), items:order_items(*)';

function normalize(row: Record<string, unknown>): OrderWithRelations {
  const o = row as unknown as Order & { client: Client | null; items: OrderItem[] };
  return {
    ...o,
    client: o.client ?? null,
    items: [...(o.items ?? [])].sort((a, b) => a.position - b.position),
  };
}

interface OrdersState {
  orders: OrderWithRelations[];
  loading: boolean;
  reload: () => Promise<void>;
}

const Ctx = createContext<OrdersState | null>(null);

/**
 * Fournit la liste des commandes (avec client + lignes) à toute l'application,
 * via UN seul abonnement temps réel et UN seul chargement — les composants
 * appellent `useOrders()` autant de fois que nécessaire sans dupliquer les
 * requêtes ni entrer en collision sur le canal Realtime.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<number>();

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(SELECT)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setOrders((data as Record<string, unknown>[]).map(normalize));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const bump = () => {
      window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(reload, 250);
    };
    const channel = supabase
      .channel('atatex-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, bump)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return createElement(Ctx.Provider, { value: { orders, loading, reload } }, children);
}

export function useOrders(): OrdersState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrders doit être utilisé dans <OrdersProvider>');
  return ctx;
}

export async function fetchOrder(id: string): Promise<OrderWithRelations | null> {
  const { data, error } = await supabase.from('orders').select(SELECT).eq('id', id).single();
  if (error || !data) return null;
  return normalize(data as Record<string, unknown>);
}
