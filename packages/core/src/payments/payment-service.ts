import { randomUUID } from 'node:crypto';

import { type Prisma, prisma } from '@beralshopp/db';
import { type CurrencyCode, money, orderStatusForPayment } from '@beralshopp/shared';

import { transitionOrder } from '../orders/order-service.ts';
import { PesapalProvider } from './pesapal/pesapal-provider.ts';
import {
  type NormalizedPaymentStatus,
  type PaymentProvider,
  PaymentProviderError,
  type PaymentProviderId,
} from './provider.ts';

/**
 * Service de paiement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  RÈGLE CENTRALE : UN PAIEMENT N'EST JAMAIS CONFIRMÉ SUR PAROLE.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Ni le retour du client sur la page de callback, ni la notification serveur (IPN)
 * ne font autorité. Les deux ne servent qu'à DÉCLENCHER une vérification : notre
 * serveur rappelle Pesapal avec ses propres identifiants, et c'est cette réponse-là
 * qui décide.
 *
 * Sans cela, n'importe qui pourrait taper /paiement/retour?status=success dans son
 * navigateur et repartir avec la marchandise.
 *
 * Trois protections complémentaires :
 *   1. IDEMPOTENCE — un IPN reçu deux fois, ou un client qui actualise la page de
 *      retour, ne déclenche qu'un seul traitement.
 *   2. JOURNAL IMMUABLE — chaque échange avec Pesapal est conservé tel quel, preuve
 *      en cas de litige avec un client ou avec le prestataire.
 *   3. RÉCONCILIATION — une tâche périodique rattrape les paiements dont l'IPN
 *      n'est jamais arrivé. C'est ce qui évite les « j'ai payé mais ma commande
 *      n'apparaît pas ».
 */

/** Registre des prestataires. Ajouter CinetPay = ajouter une ligne ici. */
function providerFor(id: PaymentProviderId): PaymentProvider {
  switch (id) {
    case 'pesapal':
      return new PesapalProvider();
    default:
      throw new PaymentProviderError(`Prestataire inconnu : ${id}`, id);
  }
}

/**
 * Choisit le prestataire selon la devise et le pays.
 * Aujourd'hui Pesapal seul ; demain, CinetPay pour la zone FCFA sans qu'aucun
 * appelant n'ait à changer.
 */
export function resolveProvider(
  currency: CurrencyCode,
  countryCode: string,
): PaymentProvider | null {
  for (const id of ['pesapal'] as const) {
    const provider = providerFor(id);
    if (provider.supports(currency, countryCode)) return provider;
  }
  return null;
}

export type InitiateResult =
  | { readonly ok: true; readonly redirectUrl: string; readonly paymentId: string }
  | { readonly ok: false; readonly message: string };

/**
 * Démarre le paiement d'une commande.
 *
 * Le montant vient EXCLUSIVEMENT de la commande en base. Aucun appelant ne peut
 * en proposer un autre — la signature ne le permet même pas.
 */
export async function initiatePayment(
  orderNumber: string,
  siteUrl: string,
): Promise<InitiateResult> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      status: true,
      totalMinor: true,
      currencySettlement: true,
      contactPhone: true,
      contactEmail: true,
      shippingAddress: true,
      payments: {
        where: { status: { in: ['INITIATED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, providerReference: true, provider: true },
      },
    },
  });

  if (!order) return { ok: false, message: 'Commande introuvable.' };

  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_FAILED') {
    return {
      ok: false,
      message: 'Cette commande ne peut plus être payée.',
    };
  }

  const address = (order.shippingAddress ?? {}) as {
    recipientName?: string;
    countryCode?: string;
  };
  const currency = order.currencySettlement as CurrencyCode;
  const countryCode = address.countryCode ?? 'RW';

  const provider = resolveProvider(currency, countryCode);
  if (!provider) {
    return {
      ok: false,
      message: `Aucun moyen de paiement disponible pour ${currency} en ${countryCode}.`,
    };
  }

  const amount = money(order.totalMinor, currency);
  const [firstName, ...rest] = (address.recipientName ?? 'Client Beralshopp').split(' ');

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: provider.id,
      merchantReference: orderNumber,
      idempotencyKey: randomUUID(),
      amountMinor: amount.amountMinor,
      currency,
      status: 'INITIATED',
    },
    select: { id: true },
  });

  try {
    const result = await provider.createPayment({
      orderNumber,
      amount,
      description: `Commande ${orderNumber} — Beralshopp`,
      customer: {
        firstName: firstName ?? 'Client',
        lastName: rest.join(' ') || 'Beralshopp',
        phone: order.contactPhone,
        email: order.contactEmail ?? undefined,
      },
      callbackUrl: `${siteUrl.replace(/\/$/, '')}/paiement/retour`,
    });

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { providerReference: result.providerReference, status: 'PENDING' },
      }),
      prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'created',
          payload: {
            providerReference: result.providerReference,
            redirectUrl: result.redirectUrl,
          },
        },
      }),
    ]);

    return { ok: true, redirectUrl: result.redirectUrl, paymentId: payment.id };
  } catch (error) {
    const message =
      error instanceof PaymentProviderError
        ? error.message
        : 'Le service de paiement est momentanément indisponible.';

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: message },
      }),
      prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'create_failed',
          payload: {
            message,
            details: (error as { details?: unknown }).details ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return { ok: false, message };
  }
}

export interface VerificationOutcome {
  readonly status: NormalizedPaymentStatus;
  readonly orderNumber: string;
  readonly changed: boolean;
  readonly message: string;
}

/**
 * Vérifie un paiement auprès du prestataire et met la commande à jour.
 *
 * Point d'entrée UNIQUE, appelé par la page de retour, par l'IPN et par la
 * réconciliation. Trois chemins, une seule logique : impossible que l'un traite
 * un cas que les autres ignorent.
 */
export async function verifyAndApplyPayment(
  providerReference: string,
): Promise<VerificationOutcome | null> {
  const payment = await prisma.payment.findFirst({
    where: { providerReference },
    select: {
      id: true,
      status: true,
      provider: true,
      order: { select: { orderNumber: true, status: true } },
    },
  });

  if (!payment) return null;

  const provider = providerFor(payment.provider as PaymentProviderId);
  const result = await provider.getStatus(providerReference);

  // Journal immuable : on enregistre AVANT d'agir, pour que la trace existe même
  // si la suite échoue.
  await prisma.paymentEvent.create({
    data: {
      paymentId: payment.id,
      eventType: `status:${result.status}`,
      payload: result.raw as Prisma.InputJsonValue,
    },
  });

  // Idempotence : un paiement déjà réussi ne peut pas être « re-réussi ».
  // Un IPN rejoué ne décrémente donc pas le stock une seconde fois.
  if (payment.status === 'COMPLETED' && result.status === 'COMPLETED') {
    return {
      status: 'COMPLETED',
      orderNumber: payment.order.orderNumber,
      changed: false,
      message: 'Paiement déjà confirmé.',
    };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: result.status === 'PENDING' ? 'PENDING' : result.status,
      methodDetail: result.methodDetail,
      failureReason: result.failureReason,
      rawResponse: result.raw as Prisma.InputJsonValue,
      lastCheckedAt: new Date(),
      ...(result.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  });

  const targetOrderStatus = orderStatusForPayment(
    result.status === 'PENDING' ? 'PENDING' : result.status,
  );

  let changed = false;
  if (targetOrderStatus && payment.order.status !== targetOrderStatus) {
    const transition = await transitionOrder(payment.order.orderNumber, targetOrderStatus, {
      type: 'WEBHOOK',
      note: `Vérifié auprès de ${payment.provider}.`,
    });
    changed = transition.ok;
  }

  return {
    status: result.status,
    orderNumber: payment.order.orderNumber,
    changed,
    message:
      result.status === 'COMPLETED'
        ? 'Paiement confirmé.'
        : result.status === 'FAILED'
          ? (result.failureReason ?? 'Paiement refusé.')
          : result.status === 'CANCELLED'
            ? 'Paiement annulé.'
            : 'Paiement en attente de confirmation.',
  };
}

/**
 * Réconciliation périodique.
 *
 * Reprend les paiements en attente depuis plus de deux minutes et réinterroge le
 * prestataire. C'est ce mécanisme qui rattrape les IPN jamais arrivés — panne
 * réseau, indisponibilité momentanée de notre serveur, ou simplement une URL de
 * notification injoignable en développement.
 *
 * À exécuter toutes les 10 à 15 minutes.
 */
export async function reconcilePendingPayments(limit = 50): Promise<{
  checked: number;
  confirmed: number;
  failed: number;
}> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);

  const pending = await prisma.payment.findMany({
    where: {
      status: { in: ['INITIATED', 'PENDING'] },
      providerReference: { not: null },
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { providerReference: true },
  });

  let confirmed = 0;
  let failed = 0;

  for (const payment of pending) {
    if (!payment.providerReference) continue;
    try {
      const outcome = await verifyAndApplyPayment(payment.providerReference);
      if (outcome?.status === 'COMPLETED') confirmed += 1;
      else if (outcome?.status === 'FAILED' || outcome?.status === 'CANCELLED') failed += 1;
    } catch {
      // Un prestataire injoignable ne doit pas interrompre la boucle : les autres
      // paiements doivent quand même être vérifiés, et celui-ci sera repris au
      // prochain passage.
    }
  }

  return { checked: pending.length, confirmed, failed };
}
