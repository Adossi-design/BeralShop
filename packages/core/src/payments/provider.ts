import type { CurrencyCode, Money } from '@beralshopp/shared';

/**
 * Interface des prestataires de paiement.
 *
 * ⚠️ LE CODE MÉTIER NE CONNAÎT JAMAIS PESAPAL. Il ne connaît que cette interface.
 *
 * Ce n'est pas de l'abstraction gratuite : Pesapal couvre le Rwanda, le Kenya,
 * l'Ouganda, la Tanzanie, le Malawi, la Zambie et le Zimbabwe — mais AUCUN des pays
 * d'Afrique de l'Ouest et Centrale visés par le plan de développement (Côte d'Ivoire,
 * Sénégal, Bénin, Cameroun, RDC, Tchad). L'ajout d'un second prestataire n'est pas
 * une hypothèse lointaine, c'est une certitude.
 *
 * Ajouter un prestataire = écrire une classe qui implémente cette interface, plus
 * une ligne de configuration. Aucune modification du panier, des commandes ou du
 * tableau de bord.
 */

export type PaymentProviderId = 'pesapal' | 'cinetpay';

/** Statut normalisé, indépendant du vocabulaire de chaque prestataire. */
export type NormalizedPaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface CreatePaymentInput {
  readonly orderNumber: string;
  readonly amount: Money;
  readonly description: string;
  readonly customer: {
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email?: string | undefined;
  };
  /** Page vers laquelle le prestataire renvoie le client après paiement. */
  readonly callbackUrl: string;
}

export interface CreatePaymentResult {
  /** URL vers laquelle rediriger le client. */
  readonly redirectUrl: string;
  /** Référence du prestataire — `OrderTrackingId` chez Pesapal. */
  readonly providerReference: string;
}

export interface PaymentStatusResult {
  readonly status: NormalizedPaymentStatus;
  /** « MTN MoMo », « VISA »… tel que rapporté par le prestataire. */
  readonly methodDetail: string | null;
  readonly failureReason: string | null;
  readonly amount: Money | null;
  /** Réponse brute, conservée telle quelle : c'est la preuve en cas de litige. */
  readonly raw: unknown;
}

export interface RefundResult {
  readonly ok: boolean;
  readonly providerReference: string | null;
  readonly message: string;
  readonly raw: unknown;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly displayName: string;

  /** Ce prestataire peut-il encaisser cette devise dans ce pays ? */
  supports(currency: CurrencyCode, countryCode: string): boolean;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Interroge le prestataire. SEULE SOURCE DE VÉRITÉ sur le statut d'un paiement.
   * Ni la page de retour du client, ni la notification serveur ne font autorité.
   */
  getStatus(providerReference: string): Promise<PaymentStatusResult>;

  refund(providerReference: string, amount: Money, reason: string): Promise<RefundResult>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: PaymentProviderId,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
