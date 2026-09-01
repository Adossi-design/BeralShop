import { type ActorType, type OrderStatus, Prisma, prisma } from '@beralshopp/db';
import {
  BASE_CURRENCY,
  type CurrencyCode,
  type Money,
  TRACKING_STEPS,
  add,
  canTransitionOrder,
  money,
  multiply,
  sum,
  trackingProgress,
  zero,
} from '@beralshopp/shared';

import type { CartOwner } from '../cart/types.ts';
import {
  RESERVATION_TTL_MINUTES,
  consumeReservation,
  releaseReservation,
  reserveStock,
} from '../inventory/stock-service.ts';
import type {
  CheckoutInput,
  CheckoutResult,
  OrderAddress,
  OrderLineView,
  OrderView,
} from './types.ts';

/**
 * Service de commandes.
 *
 * ⚠️ RÈGLE ABSOLUE : tous les montants sont RECALCULÉS ICI, à partir des prix en
 * base. Aucun montant transmis par le navigateur n'est utilisé, jamais, sous aucune
 * forme. C'est la protection n°1 contre la fraude au prix.
 *
 * La création se fait dans UNE transaction : réservation du stock, numérotation,
 * écriture de la commande et vidage du panier réussissent ensemble ou échouent
 * ensemble. Un échec à mi-parcours laisserait du stock immobilisé sans commande.
 */

/** Le stock est immobilisé jusqu'à cette échéance, puis libéré automatiquement. */
function reservationDeadline(): Date {
  return new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
}

/**
 * Choisit le tarif de livraison applicable.
 *
 * Une zone dont la liste `regions` est vide est un FOURRE-TOUT national : elle ne
 * s'applique que si aucune zone régionale ne correspond. Sans cette priorité, un
 * client de Kigali pourrait se voir facturer le tarif province.
 */
async function resolveShippingRate(
  countryCode: string,
  province: string | undefined,
  explicitRateId?: string,
): Promise<{
  id: string;
  priceMinor: number;
  currency: string;
  freeAboveMinor: number | null;
} | null> {
  if (explicitRateId) {
    const chosen = await prisma.shippingRate.findFirst({
      where: { id: explicitRateId, isActive: true },
      select: { id: true, priceMinor: true, currency: true, freeAboveMinor: true },
    });
    if (chosen) return chosen;
  }

  const zones = await prisma.shippingZone.findMany({
    where: { countryCode, isActive: true },
    select: {
      regions: true,
      rates: {
        where: { isActive: true },
        orderBy: { priceMinor: 'asc' },
        take: 1,
        select: { id: true, priceMinor: true, currency: true, freeAboveMinor: true },
      },
    },
  });

  const normalized = province?.trim().toLowerCase() ?? '';

  const regional = zones.find((zone) => {
    const regions = Array.isArray(zone.regions) ? (zone.regions as unknown[]) : [];
    return regions.some(
      (region) => typeof region === 'string' && region.trim().toLowerCase() === normalized,
    );
  });
  if (regional?.rates[0]) return regional.rates[0];

  const fallback = zones.find((zone) => {
    const regions = Array.isArray(zone.regions) ? (zone.regions as unknown[]) : [];
    return regions.length === 0;
  });
  return fallback?.rates[0] ?? null;
}

function variantLabel(options: unknown): string {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) return '';
  return Object.values(options as Record<string, unknown>)
    .filter((value): value is string => typeof value === 'string')
    .join(' · ');
}

// ─────────────────────────── Création de commande ───────────────────────────

export async function createOrderFromCart(
  owner: CartOwner,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  // Idempotence : un double clic, ou une reconnexion réseau qui rejoue la requête,
  // ne doit jamais produire deux commandes.
  const alreadyDone = await prisma.idempotencyRecord.findUnique({
    where: { key: input.idempotencyKey },
    select: { response: true },
  });
  if (alreadyDone?.response) {
    const orderNumber = (alreadyDone.response as { orderNumber?: string }).orderNumber;
    if (orderNumber) {
      const existing = await getOrderByNumber(orderNumber);
      if (existing) return { ok: true, order: existing };
    }
  }

  const cart = await prisma.cart.findFirst({
    where:
      owner.kind === 'user'
        ? { userId: owner.userId, expiresAt: { gt: new Date() } }
        : { sessionToken: owner.sessionToken, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: 'desc' },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  translations: { where: { locale: 'fr' } },
                  images: { orderBy: { position: 'asc' }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, failure: 'EMPTY_CART', message: 'Votre panier est vide.' };
  }

  // ——— Adresse ———
  let address: OrderAddress | null = input.address ?? null;

  if (input.addressId && owner.kind === 'user') {
    const saved = await prisma.address.findFirst({
      where: { id: input.addressId, userId: owner.userId },
    });
    if (saved) {
      address = {
        recipientName: saved.recipientName,
        phone: saved.phone,
        countryCode: saved.countryCode,
        ...(saved.province ? { province: saved.province } : {}),
        ...(saved.district ? { district: saved.district } : {}),
        ...(saved.sector ? { sector: saved.sector } : {}),
        ...(saved.cell ? { cell: saved.cell } : {}),
        ...(saved.village ? { village: saved.village } : {}),
        ...(saved.city ? { city: saved.city } : {}),
        ...(saved.neighbourhood ? { neighbourhood: saved.neighbourhood } : {}),
        ...(saved.streetLine ? { streetLine: saved.streetLine } : {}),
        ...(saved.landmark ? { landmark: saved.landmark } : {}),
      };
    }
  }

  if (!address) {
    return {
      ok: false,
      failure: 'INVALID_ADDRESS',
      message: 'Adresse de livraison manquante.',
    };
  }

  // ——— Vérification de vendabilité AVANT toute écriture ———
  for (const item of cart.items) {
    const { variant } = item;
    const sellable =
      variant.isActive &&
      variant.product.status === 'ACTIVE' &&
      variant.product.publishedAt !== null;

    if (!sellable) {
      return {
        ok: false,
        failure: 'UNAVAILABLE_ITEM',
        message: `« ${variant.product.translations[0]?.name ?? variant.sku} » n'est plus disponible. Retirez-le du panier.`,
        productName: variant.product.translations[0]?.name ?? variant.sku,
      };
    }
  }

  const currency = (cart.currency || BASE_CURRENCY) as CurrencyCode;

  // ——— Livraison ———
  const rate = await resolveShippingRate(
    address.countryCode,
    address.province ?? address.city,
    input.shippingRateId,
  );
  if (!rate) {
    return {
      ok: false,
      failure: 'NO_SHIPPING',
      message: "Aucune livraison n'est disponible pour cette adresse.",
    };
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        // ——— Réservation du stock, ligne par ligne ———
        const reserved: { variantId: string; quantity: number }[] = [];

        for (const item of cart.items) {
          const success = await reserveStock(tx, item.variantId, item.quantity);
          if (!success) {
            for (const done of reserved) {
              await releaseReservation(tx, done.variantId, done.quantity);
            }
            throw new StockError(item.variant.product.translations[0]?.name ?? item.variant.sku);
          }
          reserved.push({ variantId: item.variantId, quantity: item.quantity });
        }

        // ——— Montants, recalculés depuis la base ———
        const lineTotals: Money[] = [];
        const itemsData = cart.items.map((item) => {
          const { variant } = item;
          const unitPriceMinor = variant.product.basePriceMinor + variant.priceDeltaMinor;
          const lineTotal = multiply(money(unitPriceMinor, currency), item.quantity);
          lineTotals.push(lineTotal);

          return {
            variantId: variant.id,
            vendorId: variant.product.vendorId,
            productNameSnapshot: variant.product.translations[0]?.name ?? variant.sku,
            variantOptionsSnapshot: variant.options as Prisma.InputJsonValue,
            imageUrlSnapshot: variant.product.images[0]?.url ?? null,
            skuSnapshot: variant.sku,
            unitPriceMinor,
            quantity: item.quantity,
            lineTotalMinor: lineTotal.amountMinor,
          };
        });

        const subtotal = sum(lineTotals, currency);
        const shippingIsFree =
          rate.freeAboveMinor !== null && subtotal.amountMinor >= rate.freeAboveMinor;
        const shipping = shippingIsFree ? zero(currency) : money(rate.priceMinor, currency);
        const total = add(subtotal, shipping);

        // ——— Numéro de commande, depuis la séquence PostgreSQL ———
        // Une séquence garantit l'unicité même si deux commandes sont créées à la
        // même milliseconde ; un tirage aléatoire côté application, non.
        const [numberRow] = await tx.$queryRaw<{ n: string }[]>`
          SELECT beralshopp_next_order_number() AS n
        `;
        const orderNumber = numberRow?.n;
        if (!orderNumber) throw new Error('Numérotation de commande indisponible.');

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: owner.kind === 'user' ? owner.userId : null,
            status: 'PENDING_PAYMENT',
            currencyDisplay: currency,
            currencySettlement: currency,
            // Devise unique en V1 : le taux vaudra autre chose que 1 en V2.
            fxRateUsed: new Prisma.Decimal(1),
            subtotalMinor: subtotal.amountMinor,
            shippingMinor: shipping.amountMinor,
            discountMinor: 0,
            taxMinor: 0,
            totalMinor: total.amountMinor,
            shippingAddress: address as unknown as Prisma.InputJsonValue,
            contactPhone: input.contactPhone,
            contactEmail: input.contactEmail ?? null,
            customerNote: input.customerNote ?? null,
            reservationExpiresAt: reservationDeadline(),
            items: { create: itemsData },
          },
          select: { id: true, orderNumber: true },
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            toStatus: 'PENDING_PAYMENT',
            actorType: owner.kind === 'user' ? 'CUSTOMER' : 'SYSTEM',
            actorId: owner.kind === 'user' ? owner.userId : null,
            payload: { message: 'Commande créée, en attente de paiement.' },
          },
        });

        // Le panier est vidé : ses articles vivent désormais dans la commande.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        await tx.idempotencyRecord.create({
          data: {
            key: input.idempotencyKey,
            scope: 'checkout',
            userId: owner.kind === 'user' ? owner.userId : null,
            response: { orderNumber: order.orderNumber },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        // Enregistrement de l'adresse dans le carnet, si demandé.
        if (input.saveAddress && owner.kind === 'user' && !input.addressId) {
          await tx.address.create({
            data: {
              userId: owner.userId,
              recipientName: address.recipientName,
              phone: address.phone,
              countryCode: address.countryCode,
              province: address.province ?? null,
              district: address.district ?? null,
              sector: address.sector ?? null,
              cell: address.cell ?? null,
              village: address.village ?? null,
              city: address.city ?? null,
              neighbourhood: address.neighbourhood ?? null,
              streetLine: address.streetLine ?? null,
              landmark: address.landmark ?? null,
              isDefaultShipping: true,
            },
          });
        }

        return order.orderNumber;
      },
      { timeout: 15_000 },
    );

    const view = await getOrderByNumber(created);
    if (!view) throw new Error('Commande introuvable après création.');
    return { ok: true, order: view };
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false,
        failure: 'INSUFFICIENT_STOCK',
        message: `Stock insuffisant pour « ${error.productName} ». Ajustez la quantité.`,
        productName: error.productName,
      };
    }
    throw error;
  }
}

class StockError extends Error {
  constructor(readonly productName: string) {
    super(`Stock insuffisant : ${productName}`);
    this.name = 'StockError';
  }
}

// ─────────────────────────────── Lecture ───────────────────────────────

const ORDER_INCLUDE = {
  items: true,
  events: { orderBy: { createdAt: 'asc' as const } },
} as const;

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currencyDisplay: string;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;
  shippingAddress: unknown;
  contactPhone: string;
  contactEmail: string | null;
  trackingNumber: string | null;
  carrierName: string | null;
  customerNote: string | null;
  placedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  reservationExpiresAt: Date | null;
  items: {
    id: string;
    productNameSnapshot: string;
    variantOptionsSnapshot: unknown;
    imageUrlSnapshot: string | null;
    skuSnapshot: string;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
    variantId: string | null;
  }[];
  events: { toStatus: OrderStatus; createdAt: Date; actorType: string }[];
}

async function toOrderView(row: OrderRow): Promise<OrderView> {
  const currency = row.currencyDisplay as CurrencyCode;

  // Les liens produit sont résolus séparément : la commande ne dépend pas du
  // catalogue, elle en garde une copie. Le lien n'est qu'un confort.
  const variantIds = row.items
    .map((item) => item.variantId)
    .filter((id): id is string => id !== null);

  const slugs =
    variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, product: { select: { slug: true } } },
        })
      : [];
  const slugByVariant = new Map(slugs.map((v) => [v.id, v.product.slug]));

  const lines: OrderLineView[] = row.items.map((item) => ({
    id: item.id,
    productName: item.productNameSnapshot,
    variantLabel: variantLabel(item.variantOptionsSnapshot),
    sku: item.skuSnapshot,
    imageUrl: item.imageUrlSnapshot,
    unitPrice: money(item.unitPriceMinor, currency),
    quantity: item.quantity,
    lineTotal: money(item.lineTotalMinor, currency),
    productSlug: item.variantId ? (slugByVariant.get(item.variantId) ?? null) : null,
  }));

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency,
    lines,
    subtotal: money(row.subtotalMinor, currency),
    shipping: money(row.shippingMinor, currency),
    discount: money(row.discountMinor, currency),
    total: money(row.totalMinor, currency),
    shippingAddress: (row.shippingAddress ?? {}) as OrderAddress,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    trackingNumber: row.trackingNumber,
    carrierName: row.carrierName,
    customerNote: row.customerNote,
    placedAt: row.placedAt,
    paidAt: row.paidAt,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    reservationExpiresAt: row.reservationExpiresAt,
    progress: trackingProgress(row.status),
    steps: TRACKING_STEPS,
    events: row.events.map((event) => ({
      toStatus: event.toStatus,
      createdAt: event.createdAt,
      actorType: event.actorType,
    })),
  };
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderView | null> {
  const row = await prisma.order.findUnique({
    where: { orderNumber },
    include: ORDER_INCLUDE,
  });
  return row ? toOrderView(row as unknown as OrderRow) : null;
}

/**
 * Suivi public : numéro de commande ET téléphone.
 *
 * Le téléphone est indispensable. Sans lui, un numéro de commande deviné donnerait
 * accès au nom, à l'adresse et au contenu de la commande d'un inconnu.
 */
export async function trackOrder(orderNumber: string, phone: string): Promise<OrderView | null> {
  const normalizedPhone = phone.replace(/[\s().-]/g, '');

  const row = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber.trim().toUpperCase(),
      contactPhone: normalizedPhone,
    },
    include: ORDER_INCLUDE,
  });

  return row ? toOrderView(row as unknown as OrderRow) : null;
}

export async function getUserOrder(userId: string, orderNumber: string): Promise<OrderView | null> {
  const row = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: ORDER_INCLUDE,
  });
  return row ? toOrderView(row as unknown as OrderRow) : null;
}

export interface OrderSummary {
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly total: Money;
  readonly itemCount: number;
  readonly placedAt: Date;
  readonly firstImageUrl: string | null;
  readonly progress: number;
}

/**
 * Étapes visibles par le client, et les statuts internes qu'elles regroupent.
 *
 * Dix statuts techniques ne veulent rien dire pour l'acheteur. Il se pose
 * quatre questions : dois-je payer ? est-ce préparé ? est-ce parti ? est-ce
 * arrivé ? Le regroupement est fait ICI, une seule fois, et non dans chaque
 * écran : deux définitions divergentes du mot « en cours » donneraient deux
 * compteurs contradictoires sur la même page.
 *
 * Les statuts d'échec — expirée, annulée, remboursée — ne forment pas d'étape :
 * ils n'appellent aucune action et leur donner une case reviendrait à mettre en
 * avant ce qui n'a pas marché. Ils restent visibles dans la liste complète.
 */
export const ETAPES_CLIENT = {
  paiement: ['PENDING_PAYMENT'],
  preparation: ['PAID', 'PROCESSING'],
  livraison: ['SHIPPED', 'OUT_FOR_DELIVERY'],
  livrees: ['DELIVERED'],
} as const satisfies Record<string, readonly OrderStatus[]>;

export type EtapeClient = keyof typeof ETAPES_CLIENT;

/** Nombre de commandes du client dans chaque étape. */
export async function compterMesCommandes(userId: string): Promise<Record<EtapeClient, number>> {
  const lignes = await prisma.order.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  });

  const parStatut = new Map(lignes.map((l) => [String(l.status), l._count._all]));
  const total = (statuts: readonly OrderStatus[]): number =>
    statuts.reduce((somme, statut) => somme + (parStatut.get(statut) ?? 0), 0);

  return {
    paiement: total(ETAPES_CLIENT.paiement),
    preparation: total(ETAPES_CLIENT.preparation),
    livraison: total(ETAPES_CLIENT.livraison),
    livrees: total(ETAPES_CLIENT.livrees),
  };
}

export async function listUserOrders(
  userId: string,
  limit = 20,
  statuts?: readonly OrderStatus[],
): Promise<readonly OrderSummary[]> {
  const rows = await prisma.order.findMany({
    where: { userId, ...(statuts && statuts.length > 0 ? { status: { in: [...statuts] } } : {}) },
    orderBy: { placedAt: 'desc' },
    take: limit,
    select: {
      orderNumber: true,
      status: true,
      totalMinor: true,
      currencyDisplay: true,
      placedAt: true,
      items: { select: { quantity: true, imageUrlSnapshot: true } },
    },
  });

  return rows.map((row) => ({
    orderNumber: row.orderNumber,
    status: row.status,
    total: money(row.totalMinor, row.currencyDisplay as CurrencyCode),
    itemCount: row.items.reduce((total, item) => total + item.quantity, 0),
    placedAt: row.placedAt,
    firstImageUrl: row.items.find((item) => item.imageUrlSnapshot)?.imageUrlSnapshot ?? null,
    progress: trackingProgress(row.status),
  }));
}

// ─────────────────────────── Changement de statut ───────────────────────────

export type TransitionResult =
  | { readonly ok: true; readonly status: OrderStatus }
  | { readonly ok: false; readonly message: string };

/**
 * Fait évoluer une commande.
 *
 * La transition est validée par la machine à états de `@beralshopp/shared` : passer
 * de « en attente de paiement » à « livrée » sans encaissement est refusé par le
 * code, pas seulement déconseillé.
 *
 * Le stock suit automatiquement : consommé au paiement, libéré à l'annulation.
 */
export async function transitionOrder(
  orderNumber: string,
  toStatus: OrderStatus,
  actor: { type: ActorType; id?: string | null; note?: string },
): Promise<TransitionResult> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      status: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });

  if (!order) return { ok: false, message: 'Commande introuvable.' };

  if (order.status === toStatus) {
    return { ok: true, status: toStatus };
  }

  if (!canTransitionOrder(order.status, toStatus)) {
    return {
      ok: false,
      message: `Transition interdite : ${order.status} → ${toStatus}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    // Le paiement confirme la vente : la réservation devient une sortie de stock.
    if (toStatus === 'PAID') {
      for (const item of order.items) {
        if (item.variantId) await consumeReservation(tx, item.variantId, item.quantity);
      }
    }

    // Abandon avant paiement : le stock immobilisé redevient vendable.
    if (
      order.status === 'PENDING_PAYMENT' &&
      (toStatus === 'CANCELLED' || toStatus === 'PAYMENT_FAILED' || toStatus === 'EXPIRED')
    ) {
      for (const item of order.items) {
        if (item.variantId) await releaseReservation(tx, item.variantId, item.quantity);
      }
    }

    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: toStatus,
        ...(toStatus === 'PAID' ? { paidAt: now, reservationExpiresAt: null } : {}),
        ...(toStatus === 'SHIPPED' ? { shippedAt: now } : {}),
        ...(toStatus === 'DELIVERED' ? { deliveredAt: now } : {}),
        ...(toStatus === 'CANCELLED' ? { cancelledAt: now } : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus,
        actorType: actor.type,
        actorId: actor.id ?? null,
        ...(actor.note ? { payload: { note: actor.note } } : {}),
      },
    });
  });

  return { ok: true, status: toStatus };
}

/** Annulation par le client, tant que la commande n'est pas payée. */
export async function cancelOrderByCustomer(
  userId: string,
  orderNumber: string,
): Promise<TransitionResult> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    select: { status: true },
  });

  if (!order) return { ok: false, message: 'Commande introuvable.' };

  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_FAILED') {
    return {
      ok: false,
      message: 'Cette commande ne peut plus être annulée. Contactez le service client.',
    };
  }

  return transitionOrder(orderNumber, 'CANCELLED', {
    type: 'CUSTOMER',
    id: userId,
    note: 'Annulée par le client.',
  });
}
