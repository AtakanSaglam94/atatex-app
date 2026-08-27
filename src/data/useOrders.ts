import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useOrders() {
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
    const channel = supabase
      .channel('atatex-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(reload, 250);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(reload, 250);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { orders, loading, reload };
}

export async function fetchOrder(id: string): Promise<OrderWithRelations | null> {
  const { data, error } = await supabase.from('orders').select(SELECT).eq('id', id).single();
  if (error || !data) return null;
  return normalize(data as Record<string, unknown>);
}
