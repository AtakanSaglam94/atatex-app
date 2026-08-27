import type {
  ConfectionCategory,
  OrderFulfillment,
  OrderStatus,
  ProductUnit,
} from '@/types';

export const UNIT_LABEL: Record<ProductUnit, string> = {
  m: 'm',
  piece: 'pièce',
  kit: 'kit',
};

export const UNIT_SHORT: Record<ProductUnit, string> = {
  m: 'm',
  piece: 'pce',
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
