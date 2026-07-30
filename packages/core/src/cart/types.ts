import type { Money } from '@beralshopp/shared';

import type { PriceView } from '../pricing/product-price.ts';

/**
 * Vue du panier.
 *
 * ⚠️ Aucun de ces montants n'est stocké en base. Ils sont RECALCULÉS à chaque
 * affichage à partir des prix courants des produits. C'est la protection n°1 contre
 * la fraude au prix, et cela garantit qu'un client ne paie jamais un tarif obsolète.
 */

/** Anomalie détectée sur une ligne au moment du recalcul. */
export type CartLineIssue =
  /** Le produit n'est plus vendable (retiré, archivé). */
  | 'UNAVAILABLE'
  /** Plus aucun exemplaire disponible. */
  | 'OUT_OF_STOCK'
  /** Il reste du stock, mais moins que la quantité demandée. */
  | 'REDUCED_STOCK'
  /** Le prix a changé depuis l'ajout au panier. */
  | 'PRICE_CHANGED';

export interface CartLineView {
  readonly id: string;
  readonly variantId: string;
  readonly productSlug: string;
  readonly productName: string;
  /** « Noir · M ». Chaîne vide si le produit n'a pas d'options. */
  readonly variantLabel: string;
  readonly sku: string;
  readonly imageUrl: string | null;
  readonly unitPrice: PriceView;
  readonly quantity: number;
  readonly lineTotal: Money;
  /** Stock réellement disponible : physique moins réservé. */
  readonly availableQuantity: number;
  readonly issue: CartLineIssue | null;
}

export interface CartView {
  readonly id: string;
  readonly currency: string;
  readonly lines: readonly CartLineView[];
  /** Nombre total d'articles, quantités comprises. */
  readonly itemCount: number;
  readonly subtotal: Money;

  /**
   * Estimation de livraison, calculée sur le tarif le moins cher du pays.
   * Le montant définitif est fixé au tunnel de commande, une fois l'adresse connue.
   * `null` si aucune zone de livraison n'est configurée.
   */
  readonly shippingEstimate: Money | null;
  /** Seuil de franchise de port, s'il existe. */
  readonly freeShippingThreshold: Money | null;
  /** Reste à ajouter pour obtenir la livraison offerte. `null` si déjà atteint. */
  readonly remainingForFreeShipping: Money | null;
  readonly isShippingFree: boolean;

  readonly total: Money;
  /** Vrai si au moins une ligne demande l'attention du client. */
  readonly hasIssues: boolean;
}

/** Identification du panier : compte connecté, ou cookie de visiteur. */
export type CartOwner =
  | { readonly kind: 'user'; readonly userId: string }
  | { readonly kind: 'guest'; readonly sessionToken: string };

export type CartMutationResult =
  | { readonly ok: true; readonly cart: CartView }
  | { readonly ok: false; readonly reason: CartError; readonly message: string };

export type CartError =
  'VARIANT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'LINE_NOT_FOUND' | 'INVALID_QUANTITY';

/** Plafond par ligne : limite l'impact d'une commande frauduleuse. */
export const MAX_QUANTITY_PER_LINE = 99;

/** Durée de vie d'un panier de visiteur non connecté. */
export const GUEST_CART_TTL_DAYS = 7;
/** Durée de vie d'un panier rattaché à un compte. */
export const USER_CART_TTL_DAYS = 60;
