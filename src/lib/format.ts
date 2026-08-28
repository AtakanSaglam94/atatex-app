import type {
  Client,
  ConfectionCategory,
  OrderFulfillment,
  PickupPoint,
  OrderStatus,
  ProductUnit,
} from '@/types';

export const UNIT_LABEL: Record<ProductUnit, string> = {
  m: 'm',
  piece: 'pièce',
  paquet_100: 'paquet de 100',
  kit: 'kit',
};

export const UNIT_SHORT: Record<ProductUnit, string> = {
  m: 'm',
  piece: 'pce',
  paquet_100: 'pqt/100',
  kit: 'kit',
};

export const CONFECTION_CATEGORY_LABEL: Record<ConfectionCategory, string> = {
  rideau_voilage: 'Rideau / Voilage',
  tenture: 'Tenture',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  recue: 'Commande reçue',
  fabrication: 'En fabrication',
  pret: 'Prêt',
  termine: 'Terminé',
};

/** Libellé du dernier statut selon le mode (retrait → « Finalisé », livraison → « Livré »). */
export function terminalStatusLabel(fulfillment: OrderFulfillment): string {
  return fulfillment === 'livraison' ? 'Livré' : 'Finalisé';
}

/** Libellé d'affichage du statut, en tenant compte du mode de remise. */
export function statusLabel(status: OrderStatus, fulfillment: OrderFulfillment): string {
  if (status === 'termine') return terminalStatusLabel(fulfillment);
  return STATUS_LABEL[status];
}

export const STATUS_ORDER: OrderStatus[] = ['recue', 'fabrication', 'pret', 'termine'];

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = STATUS_ORDER.indexOf(status);
  return i >= 0 && i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
}

export function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Libellé complet d'un client (raison sociale, ou prénom + nom). */
export function clientDisplayName(
  c: Partial<Pick<Client, 'client_type' | 'company_name' | 'first_name' | 'last_name' | 'name'>>,
): string {
  if (c.client_type === 'professionnel' && c.company_name?.trim()) return c.company_name.trim();
  const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
  return full || c.name || 'Client';
}

/** Adresse d'un client sur une ligne (rue, CP ville, pays si ≠ BE). */
export function clientAddressText(
  c: Partial<Pick<Client, 'address_line' | 'postal_code' | 'city' | 'country' | 'address'>>,
): string {
  const parts = [
    c.address_line,
    [c.postal_code, c.city].filter(Boolean).join(' '),
    c.country && c.country !== 'BE' ? c.country : '',
  ].filter(Boolean);
  return parts.join(', ') || c.address || '';
}

/** Libellé d'un point de retrait : "Marché de Châtelineau (Samedi)". */
export function pickupPointLabel(p: Pick<PickupPoint, 'name' | 'day'>): string {
  return p.day ? `${p.name} (${p.day})` : p.name;
}

/** Comment le client récupère sa commande. */
export function fulfillmentText(
  fulfillment: OrderFulfillment,
  point: Pick<PickupPoint, 'name' | 'day'> | null,
): string {
  if (fulfillment === 'livraison') return 'Livraison à domicile';
  return point ? `Retrait — ${pickupPointLabel(point)}` : 'Retrait';
}
