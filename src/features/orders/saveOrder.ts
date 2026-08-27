import { supabase, sendStatusEmail } from '@/lib/supabase';
import type {
  ConfectionType,
  DiscountKind,
  OrderFulfillment,
  OrderStatus,
  Product,
  ProductCategory,
} from '@/types';
import { computeLine, type DraftItem } from './orderLines';
import { emailTemplateKeyFor } from './statusEmail';

export interface OrderDraft {
  id: string | null;
  client_id: string;
  order_date: string;
  status: OrderStatus;
  fulfillment: OrderFulfillment;
  discount_type: DiscountKind;
  discount_value: number;
  round_total: boolean;
  deposit_amount: number;
  notes: string;
  items: DraftItem[];
}

export interface SaveResult {
  ok: boolean;
  orderId?: string;
  error?: string;
}

export async function saveOrder(
  draft: OrderDraft,
  products: Product[],
  confectionTypes: ConfectionType[],
  categories: ProductCategory[],
  previousStatus: OrderStatus | null,
): Promise<SaveResult> {
  const validItems = draft.items.filter((d) => {
    if (d.kind === 'libre') return d.label.trim() && d.qty > 0;
    if (d.kind === 'service') return d.qty > 0;
    return d.product_id && (d.is_confection ? (d.largeur ?? 0) > 0 : d.qty > 0);
  });

  if (!draft.client_id) return { ok: false, error: 'Sélectionnez un client.' };
  if (validItems.length === 0) return { ok: false, error: 'Ajoutez au moins une ligne valide.' };

  // Bloque l'enregistrement si une ligne est en erreur (largeur hors limites, quantité max…)
  const lineErrors = validItems
    .map((d) => computeLine(d, products, confectionTypes, categories).error)
    .filter(Boolean);
  if (lineErrors.length > 0) return { ok: false, error: lineErrors[0] as string };

  const orderPayload = {
    client_id: draft.client_id,
    order_date: draft.order_date,
    status: draft.status,
    fulfillment: draft.fulfillment,
    discount_type: draft.discount_type,
    discount_value: draft.discount_value,
    round_total: draft.round_total,
    deposit_amount: draft.deposit_amount,
    notes: draft.notes,
  };

  let orderId = draft.id;

  if (orderId) {
    const { error } = await supabase.from('orders').update(orderPayload).eq('id', orderId);
    if (error) return { ok: false, error: error.message };
    await supabase.from('order_items').delete().eq('order_id', orderId);
  } else {
    const { data, error } = await supabase.from('orders').insert(orderPayload).select('id').single();
    if (error || !data) return { ok: false, error: error?.message ?? 'Création impossible' };
    orderId = data.id as string;
  }

  const rows = validItems.map((d, i) => {
    const c = computeLine(d, products, confectionTypes, categories);
    return {
      order_id: orderId,
      position: i,
      kind: d.kind,
      label: c.label,
      unit: c.unit,
      qty: c.qty,
      unit_price: c.unit_price,
      line_total: c.line_total,
      product_id: d.product_id,
      service_id: d.service_id,
      is_confection: c.is_confection,
      confection_type_id: c.confection_type_id,
      confection_type_label: c.confection_type_label,
      confection_category: c.confection_category,
      largeur: c.largeur,
      facteur: c.facteur,
      marge_fixe: c.marge_fixe,
      frais_confection: c.frais_confection,
      metrage: c.metrage,
    };
  });

  const { error: itemsError } = await supabase.from('order_items').insert(rows);
  if (itemsError) return { ok: false, error: itemsError.message };

  // Email de changement de statut (non bloquant)
  if (draft.status !== previousStatus) {
    const key = emailTemplateKeyFor(draft.status, draft.fulfillment);
    if (key) void sendStatusEmail(orderId!, key);
  }

  return { ok: true, orderId: orderId! };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  fulfillment: OrderFulfillment,
): Promise<SaveResult> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) return { ok: false, error: error.message };
  const key = emailTemplateKeyFor(status, fulfillment);
  if (key) void sendStatusEmail(orderId, key);
  return { ok: true, orderId };
}
