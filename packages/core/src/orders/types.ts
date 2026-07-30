import type { OrderStatus } from '@beralshopp/db';
import type { Money, TrackingStep } from '@beralshopp/shared';

/** Adresse figée dans la commande. Copie, jamais référence. */
export interface OrderAddress {
  readonly recipientName: string;
  readonly phone: string;
  readonly countryCode: string;
  readonly province?: string;
  readonly district?: string;
  readonly sector?: string;
  readonly cell?: string;
  readonly village?: string;
  readonly city?: string;
  readonly neighbourhood?: string;
  readonly streetLine?: string;
  readonly postalCode?: string;
  readonly landmark?: string;
}

export interface OrderLineView {
  readonly id: string;
  readonly productName: string;
  readonly variantLabel: string;
  readonly sku: string;
  readonly imageUrl: string | null;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly lineTotal: Money;
  /** `null` si le produit a été supprimé du catalogue depuis. */
  readonly productSlug: string | null;
}

export interface OrderEventView {
  readonly toStatus: OrderStatus;
  readonly createdAt: Date;
  readonly actorType: string;
}

export interface OrderView {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly currency: string;

  readonly lines: readonly OrderLineView[];
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly discount: Money;
  readonly total: Money;

  readonly shippingAddress: OrderAddress;
  readonly contactPhone: string;
  readonly contactEmail: string | null;

  readonly trackingNumber: string | null;
  readonly carrierName: string | null;
  readonly customerNote: string | null;

  readonly placedAt: Date;
  readonly paidAt: Date | null;
  readonly shippedAt: Date | null;
  readonly deliveredAt: Date | null;
  readonly reservationExpiresAt: Date | null;

  /** Étape atteinte dans le parcours affiché au client. -1 si interrompue. */
  readonly progress: number;
  readonly steps: readonly TrackingStep[];
  readonly events: readonly OrderEventView[];
}

export interface CheckoutInput {
  /** Adresse existante du carnet, ou nouvelle adresse saisie. */
  readonly addressId?: string;
  readonly address?: OrderAddress;
  /** Enregistrer l'adresse dans le carnet. Ignoré pour un visiteur non connecté. */
  readonly saveAddress?: boolean;

  readonly shippingRateId?: string;
  readonly contactPhone: string;
  readonly contactEmail?: string;
  readonly customerNote?: string;

  /** Empêche qu'un double clic ne crée deux commandes. */
  readonly idempotencyKey: string;
}

export type CheckoutFailure =
  'EMPTY_CART' | 'INSUFFICIENT_STOCK' | 'INVALID_ADDRESS' | 'NO_SHIPPING' | 'UNAVAILABLE_ITEM';

export type CheckoutResult =
  | { readonly ok: true; readonly order: OrderView }
  | {
      readonly ok: false;
      readonly failure: CheckoutFailure;
      readonly message: string;
      /** Nom du produit fautif, pour un message précis. */
      readonly productName?: string;
    };
