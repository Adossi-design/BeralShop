import type { OrderStatus } from '@beralshopp/db';

/**
 * Pastille de statut de commande.
 *
 * Les couleurs portent un sens opérationnel, pas décoratif :
 *   or    → une action de l'équipe est attendue
 *   vert  → encaissé ou terminé
 *   bleu  → en cours de traitement logistique
 *   gris  → dossier clos sans vente
 *   rouge → anomalie
 */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: 'Attente paiement',
    className: 'bg-gold-100 text-gold-800',
  },
  PAYMENT_FAILED: {
    label: 'Paiement échoué',
    className: 'bg-danger-500/10 text-danger-500',
  },
  EXPIRED: { label: 'Expirée', className: 'bg-ink-100 text-ink-600' },
  CANCELLED: { label: 'Annulée', className: 'bg-ink-100 text-ink-600' },
  PAID: { label: 'Payée', className: 'bg-success-500/10 text-success-500' },
  PROCESSING: { label: 'En préparation', className: 'bg-info-500/10 text-info-500' },
  SHIPPED: { label: 'Expédiée', className: 'bg-info-500/10 text-info-500' },
  OUT_FOR_DELIVERY: { label: 'En livraison', className: 'bg-info-500/10 text-info-500' },
  DELIVERED: { label: 'Livrée', className: 'bg-success-500/10 text-success-500' },
  REFUNDED: { label: 'Remboursée', className: 'bg-ink-100 text-ink-600' },
};

export function OrderStatusBadge({ status }: { readonly status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
