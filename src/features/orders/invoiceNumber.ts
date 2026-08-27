import { supabase } from '@/lib/supabase';

/**
 * Attribue (une seule fois) un numéro de facture séquentiel à une commande,
 * via la fonction Postgres next_number('invoice', 'F').
 */
export async function assignInvoiceNumber(orderId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('orders')
    .select('invoice_number')
    .eq('id', orderId)
    .single();
  if (existing?.invoice_number) return existing.invoice_number;

  const { data: number, error } = await supabase.rpc('next_number', {
    p_kind: 'invoice',
    p_prefix: 'F',
  });
  if (error || !number) return null;

  const { error: updErr } = await supabase
    .from('orders')
    .update({ invoice_number: number, invoiced_at: new Date().toISOString() })
    .eq('id', orderId)
    .is('invoice_number', null);
  if (updErr) return null;

  return number as string;
}
