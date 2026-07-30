/**
 * Machine à états des commandes et des paiements.
 *
 * Les transitions sont contrôlées par le code, jamais par un champ libre. Une transition
 * interdite lève une erreur : il est impossible de passer une commande de « en attente de
 * paiement » à « livrée » en sautant l'encaissement.
 */

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_FAILED',
  'EXPIRED',
  'CANCELLED',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Transitions autorisées. Toute transition absente de cette table est refusée. */
const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED'],
  // Le client peut réessayer de payer après un échec.
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  EXPIRED: ['PENDING_PAYMENT', 'CANCELLED'],
  CANCELLED: [],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

/** Statuts à partir desquels plus aucune évolution n'est possible. */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

/** Le stock est-il encore immobilisé par cette commande ? */
export function holdsStock(status: OrderStatus): boolean {
  return status === 'PENDING_PAYMENT';
}

/** Le stock a-t-il été définitivement décrémenté ? */
export function consumedStock(status: OrderStatus): boolean {
  return (
    status === 'PAID' ||
    status === 'PROCESSING' ||
    status === 'SHIPPED' ||
    status === 'OUT_FOR_DELIVERY' ||
    status === 'DELIVERED' ||
    status === 'REFUNDED'
  );
}

// ————————————————————————— Paiements —————————————————————————

export const PAYMENT_STATUSES = [
  'INITIATED',
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  INITIATED: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PENDING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

/**
 * Statut de paiement → statut de commande correspondant.
 * Utilisé après chaque vérification auprès du prestataire.
 */
export function orderStatusForPayment(payment: PaymentStatus): OrderStatus | null {
  switch (payment) {
    case 'COMPLETED':
      return 'PAID';
    case 'FAILED':
      return 'PAYMENT_FAILED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'INITIATED':
    case 'PENDING':
      return null; // On ne touche pas à la commande tant que rien n'est tranché.
    default: {
      const exhaustive: never = payment;
      throw new Error(`Statut de paiement inconnu : ${String(exhaustive)}`);
    }
  }
}

// ————————————————————— Suivi client —————————————————————

/**
 * Étapes affichées au client sur la page de suivi.
 * Volontairement plus simples que les statuts internes : le client n'a pas besoin de
 * connaître la différence entre « expirée » et « paiement échoué ».
 */
export const TRACKING_STEPS = [
  'ORDER_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type TrackingStep = (typeof TRACKING_STEPS)[number];

/** Index de l'étape atteinte, ou -1 si la commande est interrompue (annulée, remboursée). */
export function trackingProgress(status: OrderStatus): number {
  switch (status) {
    case 'PENDING_PAYMENT':
    case 'PAYMENT_FAILED':
      return 0;
    case 'PAID':
      return 1;
    case 'PROCESSING':
      return 2;
    case 'SHIPPED':
      return 3;
    case 'OUT_FOR_DELIVERY':
      return 4;
    case 'DELIVERED':
      return 5;
    case 'CANCELLED':
    case 'EXPIRED':
    case 'REFUNDED':
      return -1;
    default: {
      const exhaustive: never = status;
      throw new Error(`Statut de commande inconnu : ${String(exhaustive)}`);
    }
  }
}
