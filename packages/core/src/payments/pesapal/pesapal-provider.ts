import {
  type CurrencyCode,
  type Money,
  PESAPAL_SETTLEMENT_CURRENCIES,
  money,
  toMajor,
} from '@beralshopp/shared';

import {
  type CreatePaymentInput,
  type CreatePaymentResult,
  type NormalizedPaymentStatus,
  type PaymentProvider,
  PaymentProviderError,
  type PaymentStatusResult,
  type RefundResult,
} from '../provider.ts';
import {
  type PesapalConfig,
  getTransactionStatus,
  readPesapalConfig,
  requestRefund,
  submitOrder,
} from './pesapal-client.ts';

/**
 * Adaptateur Pesapal.
 *
 * Traduit le vocabulaire Pesapal en langage Beralshopp, et rien de plus. Toute la
 * logique métier — création de commande, stock, confirmation — vit ailleurs.
 *
 * Pays couverts par Pesapal : Rwanda, Kenya, Ouganda, Tanzanie, Malawi, Zambie,
 * Zimbabwe. Pour l'Afrique de l'Ouest et Centrale, un second adaptateur sera
 * nécessaire — d'où l'interface.
 */

const PESAPAL_COUNTRIES = new Set(['RW', 'KE', 'UG', 'TZ', 'MW', 'ZM', 'ZW']);

/**
 * Correspondance des statuts Pesapal.
 *
 * `status_code` de GetTransactionStatus :
 *   0 = INVALID, 1 = COMPLETED, 2 = FAILED, 3 = REVERSED
 *
 * ⚠️ INVALID (0) est traité comme EN ATTENTE, jamais comme un échec : c'est l'état
 * d'une transaction créée dont le client n'a pas encore terminé le paiement. La
 * marquer échouée libérerait le stock alors que le client est en train de payer.
 */
function normalizeStatus(
  statusCode: number | undefined,
  description: string | undefined,
): NormalizedPaymentStatus {
  switch (statusCode) {
    case 1:
      return 'COMPLETED';
    case 2:
      return 'FAILED';
    case 3:
      return 'REFUNDED';
    case 0:
    default: {
      const text = (description ?? '').toUpperCase();
      if (text.includes('COMPLETED')) return 'COMPLETED';
      if (text.includes('FAILED')) return 'FAILED';
      if (text.includes('REVERSED')) return 'REFUNDED';
      return 'PENDING';
    }
  }
}

/** Pesapal attend un prénom et un nom séparés ; nous stockons un nom complet. */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? 'Client', lastName: 'Beralshopp' };
  return {
    firstName: parts[0] ?? 'Client',
    lastName: parts.slice(1).join(' '),
  };
}

export class PesapalProvider implements PaymentProvider {
  readonly id = 'pesapal' as const;
  readonly displayName = 'Pesapal — Mobile Money & cartes';

  constructor(
    private readonly config: PesapalConfig = readPesapalConfig(),
    private readonly ipnId: string = process.env['PESAPAL_IPN_ID'] ?? '',
  ) {}

  supports(currency: CurrencyCode, countryCode: string): boolean {
    return (
      PESAPAL_SETTLEMENT_CURRENCIES.includes(currency) &&
      PESAPAL_COUNTRIES.has(countryCode.toUpperCase())
    );
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.ipnId) {
      throw new PaymentProviderError(
        'PESAPAL_IPN_ID absent. Lancer `pnpm pesapal:ipn` une fois par environnement ' +
          "pour enregistrer l'URL de notification, puis reporter l'identifiant obtenu.",
        'pesapal',
      );
    }

    const { firstName, lastName } = splitName(
      `${input.customer.firstName} ${input.customer.lastName}`.trim(),
    );

    const response = await submitOrder(this.config, {
      // `id` est notre référence marchande : le numéro de commande, lisible dans
      // le tableau de bord Pesapal comme dans le nôtre.
      id: input.orderNumber,
      currency: input.amount.currency,
      // Pesapal attend un montant en unité PRINCIPALE, pas en plus petite unité.
      // Le franc rwandais ayant un exposant de 0, les deux coïncident — mais ce ne
      // sera plus vrai le jour où l'on encaissera en USD ou en EUR.
      amount: toMajor(input.amount),
      description: input.description.slice(0, 100),
      callback_url: input.callbackUrl,
      notification_id: this.ipnId,
      billing_address: {
        phone_number: input.customer.phone,
        ...(input.customer.email ? { email_address: input.customer.email } : {}),
        first_name: firstName,
        last_name: lastName,
        country_code: 'RW',
      },
    });

    if (response.error?.message || !response.redirect_url || !response.order_tracking_id) {
      throw new PaymentProviderError(
        response.error?.message ?? "Pesapal n'a pas renvoyé d'URL de paiement.",
        'pesapal',
        response,
      );
    }

    return {
      redirectUrl: response.redirect_url,
      providerReference: response.order_tracking_id,
    };
  }

  async getStatus(providerReference: string): Promise<PaymentStatusResult> {
    const response = await getTransactionStatus(this.config, providerReference);

    const status = normalizeStatus(response.status_code, response.payment_status_description);
    const currency = (response.currency ?? 'RWF') as CurrencyCode;

    return {
      status,
      methodDetail: response.payment_method ?? null,
      failureReason:
        status === 'FAILED' ? (response.description ?? response.message ?? null) : null,
      amount:
        typeof response.amount === 'number'
          ? // Retour à la plus petite unité : c'est la seule forme que le reste du
            // système accepte.
            money(Math.round(response.amount * (currency === 'RWF' ? 1 : 100)), currency)
          : null,
      raw: response,
    };
  }

  async refund(providerReference: string, amount: Money, reason: string): Promise<RefundResult> {
    // Le remboursement Pesapal exige le CODE DE CONFIRMATION de la transaction,
    // pas l'identifiant de suivi : on le récupère d'abord.
    const status = await getTransactionStatus(this.config, providerReference);
    const confirmationCode = status.confirmation_code;

    if (!confirmationCode) {
      return {
        ok: false,
        providerReference: null,
        message:
          'Aucun code de confirmation : la transaction n’a jamais été encaissée, ' +
          'il n’y a donc rien à rembourser.',
        raw: status,
      };
    }

    const response = await requestRefund(
      this.config,
      confirmationCode,
      toMajor(amount),
      'Beralshopp',
      reason.slice(0, 100),
    );

    const ok = String(response.status ?? '') === '200';
    return {
      ok,
      providerReference: confirmationCode,
      message: response.message ?? (ok ? 'Remboursement demandé.' : 'Remboursement refusé.'),
      raw: response,
    };
  }
}
