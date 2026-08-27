import type { EmailTemplateKey, OrderFulfillment, OrderStatus } from '@/types';

/** Modèle d'email correspondant au statut atteint (null = pas d'email pour ce statut). */
export function emailTemplateKeyFor(
  status: OrderStatus,
  fulfillment: OrderFulfillment,
): EmailTemplateKey | null {
  switch (status) {
    case 'recue':
      return 'recue';
    case 'fabrication':
      return 'fabrication';
    case 'pret':
      return fulfillment === 'livraison' ? 'pret_livraison' : 'pret_retrait';
    case 'termine':
      return 'termine';
    default:
      return null;
  }
}
