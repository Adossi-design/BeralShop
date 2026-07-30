import { type OrderStatus, type Prisma, prisma } from '@beralshopp/db';
import { type CurrencyCode, type Money, allowedOrderTransitions, money } from '@beralshopp/shared';

import { transitionOrder } from '../orders/order-service.ts';

/**
 * Services d'administration.
 *
 * ⚠️ TOUTE ACTION ADMIN EST JOURNALISÉE dans `admin_audit_logs`, avec la valeur
 * avant et après. Sans ce journal, il devient impossible de savoir qui a modifié un
 * prix ou changé le statut d'une commande — et une équipe qui grandit finit toujours
 * par avoir besoin de le savoir.
 *
 * ⚠️ AUCUNE SUPPRESSION DE COMMANDE n'est proposée, volontairement. Supprimer une
 * commande laisse le stock réservé (voir `pnpm db:reconcile`) et efface une trace
 * comptable. On ANNULE, ce qui libère le stock et conserve l'historique.
 */

export interface AdminActor {
  readonly id: string;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}

async function audit(
  actor: AdminActor,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorId: actor.id,
      action,
      entityType,
      entityId,
      before: (before ?? null) as Prisma.InputJsonValue,
      after: (after ?? null) as Prisma.InputJsonValue,
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    },
  });
}

// ─────────────────────────────── Commandes ───────────────────────────────

export interface AdminOrderRow {
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly total: Money;
  readonly itemCount: number;
  readonly customerName: string;
  readonly contactPhone: string;
  readonly placedAt: Date;
  readonly trackingNumber: string | null;
}

export interface AdminOrderFilters {
  readonly status?: OrderStatus;
  /** Recherche sur le numéro de commande ou le téléphone du client. */
  readonly query?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export async function listAdminOrders(
  filters: AdminOrderFilters = {},
): Promise<{ rows: readonly AdminOrderRow[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(filters.limit ?? 30, 1), 100);
  const query = filters.query?.trim();

  const rows = await prisma.order.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query.toUpperCase() } },
              { contactPhone: { contains: query.replace(/[\s().-]/g, '') } },
            ],
          }
        : {}),
    },
    orderBy: [{ placedAt: 'desc' }, { id: 'asc' }],
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalMinor: true,
      currencyDisplay: true,
      contactPhone: true,
      placedAt: true,
      trackingNumber: true,
      shippingAddress: true,
      items: { select: { quantity: true } },
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    rows: page.map((row) => ({
      orderNumber: row.orderNumber,
      status: row.status,
      total: money(row.totalMinor, row.currencyDisplay as CurrencyCode),
      itemCount: row.items.reduce((total, item) => total + item.quantity, 0),
      customerName:
        (row.shippingAddress as { recipientName?: string } | null)?.recipientName ?? '—',
      contactPhone: row.contactPhone,
      placedAt: row.placedAt,
      trackingNumber: row.trackingNumber,
    })),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

/** Statuts vers lesquels la commande peut évoluer, pour n'afficher que ceux-là. */
export function nextStatusesFor(status: OrderStatus): readonly OrderStatus[] {
  return allowedOrderTransitions(status);
}

export async function adminChangeOrderStatus(
  actor: AdminActor,
  orderNumber: string,
  toStatus: OrderStatus,
  note?: string,
): Promise<{ ok: boolean; message?: string }> {
  const before = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });
  if (!before) return { ok: false, message: 'Commande introuvable.' };

  const result = await transitionOrder(orderNumber, toStatus, {
    type: 'ADMIN',
    id: actor.id,
    ...(note ? { note } : {}),
  });

  if (!result.ok) return { ok: false, message: result.message };

  await audit(
    actor,
    'order.status_change',
    'Order',
    before.id,
    { status: before.status },
    { status: toStatus, note: note ?? null },
  );

  return { ok: true };
}

export async function adminSetTracking(
  actor: AdminActor,
  orderNumber: string,
  trackingNumber: string,
  carrierName: string,
): Promise<{ ok: boolean; message?: string }> {
  const before = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, trackingNumber: true, carrierName: true },
  });
  if (!before) return { ok: false, message: 'Commande introuvable.' };

  await prisma.order.update({
    where: { id: before.id },
    data: {
      trackingNumber: trackingNumber.trim() || null,
      carrierName: carrierName.trim() || null,
    },
  });

  await audit(
    actor,
    'order.tracking_set',
    'Order',
    before.id,
    { trackingNumber: before.trackingNumber, carrierName: before.carrierName },
    { trackingNumber: trackingNumber.trim(), carrierName: carrierName.trim() },
  );

  return { ok: true };
}

export async function adminSetInternalNote(
  actor: AdminActor,
  orderNumber: string,
  note: string,
): Promise<void> {
  const before = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, internalNote: true },
  });
  if (!before) return;

  await prisma.order.update({
    where: { id: before.id },
    data: { internalNote: note.trim() || null },
  });

  await audit(
    actor,
    'order.note_set',
    'Order',
    before.id,
    { internalNote: before.internalNote },
    { internalNote: note.trim() },
  );
}

// ─────────────────────────────── Produits ───────────────────────────────

export interface AdminProductRow {
  readonly id: string;
  readonly sku: string;
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly price: Money;
  readonly compareAt: Money | null;
  readonly totalStock: number;
  readonly availableStock: number;
  readonly variantCount: number;
  readonly categoryName: string | null;
  readonly salesCount: number;
}

export async function listAdminProducts(options: {
  query?: string;
  status?: string;
  limit?: number;
}): Promise<readonly AdminProductRow[]> {
  const query = options.query?.trim();

  const rows = await prisma.product.findMany({
    where: {
      ...(options.status ? { status: options.status as 'ACTIVE' } : {}),
      ...(query
        ? {
            OR: [
              { sku: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
              {
                translations: {
                  some: { name: { contains: query, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(options.limit ?? 50, 200),
    select: {
      id: true,
      sku: true,
      slug: true,
      status: true,
      basePriceMinor: true,
      compareAtPriceMinor: true,
      currency: true,
      salesCount: true,
      translations: { where: { locale: 'fr' }, select: { name: true } },
      category: {
        select: { translations: { where: { locale: 'fr' }, select: { name: true } } },
      },
      variants: {
        select: { stockQuantity: true, reservedQuantity: true, isActive: true },
      },
    },
  });

  return rows.map((row) => {
    const currency = row.currency as CurrencyCode;
    const active = row.variants.filter((v) => v.isActive);
    return {
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      name: row.translations[0]?.name ?? row.sku,
      status: row.status,
      price: money(row.basePriceMinor, currency),
      compareAt: row.compareAtPriceMinor !== null ? money(row.compareAtPriceMinor, currency) : null,
      totalStock: active.reduce((total, v) => total + v.stockQuantity, 0),
      availableStock: active.reduce(
        (total, v) => total + Math.max(0, v.stockQuantity - v.reservedQuantity),
        0,
      ),
      variantCount: active.length,
      categoryName: row.category?.translations[0]?.name ?? null,
      salesCount: row.salesCount,
    };
  });
}

export async function adminUpdateProductPricing(
  actor: AdminActor,
  productId: string,
  basePriceMinor: number,
  compareAtPriceMinor: number | null,
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
): Promise<{ ok: boolean; message?: string }> {
  if (!Number.isInteger(basePriceMinor) || basePriceMinor < 0) {
    return { ok: false, message: 'Le prix doit être un entier positif.' };
  }
  if (
    compareAtPriceMinor !== null &&
    (!Number.isInteger(compareAtPriceMinor) || compareAtPriceMinor < 0)
  ) {
    return { ok: false, message: "L'ancien prix doit être un entier positif." };
  }

  const before = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      basePriceMinor: true,
      compareAtPriceMinor: true,
      status: true,
      publishedAt: true,
    },
  });
  if (!before) return { ok: false, message: 'Produit introuvable.' };

  await prisma.product.update({
    where: { id: productId },
    data: {
      basePriceMinor,
      compareAtPriceMinor,
      status,
      // Publier un produit pour la première fois fixe sa date de publication :
      // sans elle, il n'apparaîtrait nulle part, tous les écrans filtrant dessus.
      ...(status === 'ACTIVE' && before.publishedAt === null ? { publishedAt: new Date() } : {}),
    },
  });

  await audit(actor, 'product.update', 'Product', productId, before, {
    basePriceMinor,
    compareAtPriceMinor,
    status,
  });

  return { ok: true };
}

export async function adminUpdateStock(
  actor: AdminActor,
  variantId: string,
  stockQuantity: number,
): Promise<{ ok: boolean; message?: string }> {
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return { ok: false, message: 'Le stock doit être un entier positif ou nul.' };
  }

  const before = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stockQuantity: true, reservedQuantity: true, sku: true },
  });
  if (!before) return { ok: false, message: 'Variante introuvable.' };

  // On ne descend jamais sous le réservé : ces exemplaires appartiennent à des
  // commandes en attente de paiement, et la contrainte en base refuserait l'écriture.
  if (stockQuantity < before.reservedQuantity) {
    return {
      ok: false,
      message: `Impossible : ${before.reservedQuantity} exemplaire(s) sont réservés par des commandes en cours.`,
    };
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { stockQuantity },
  });

  await audit(
    actor,
    'variant.stock_update',
    'ProductVariant',
    variantId,
    { stockQuantity: before.stockQuantity },
    { stockQuantity },
  );

  return { ok: true };
}

// ─────────────────────────────── Clients ───────────────────────────────

export interface AdminCustomerRow {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly isActive: boolean;
  readonly orderCount: number;
  readonly totalSpent: Money;
  readonly createdAt: Date;
  readonly lastLoginAt: Date | null;
}

export async function listAdminCustomers(options: {
  query?: string;
  limit?: number;
}): Promise<readonly AdminCustomerRow[]> {
  const query = options.query?.trim();

  const rows = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query.replace(/[\s().-]/g, '') } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(options.limit ?? 50, 200),
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      orders: {
        where: {
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
        },
        select: { totalMinor: true, currencyDisplay: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    isActive: row.isActive,
    orderCount: row.orders.length,
    totalSpent: money(
      row.orders.reduce((total, order) => total + order.totalMinor, 0),
      (row.orders[0]?.currencyDisplay ?? 'RWF') as CurrencyCode,
    ),
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
  }));
}

/**
 * Active ou désactive un compte client.
 * Un compte désactivé ne peut plus se connecter, et ses sessions en cours tombent
 * à la prochaine requête — c'est l'intérêt des sessions en base.
 */
export async function adminSetCustomerActive(
  actor: AdminActor,
  userId: string,
  isActive: boolean,
): Promise<void> {
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, role: true },
  });
  // Un administrateur ne se désactive pas lui-même, et n'en désactive pas un autre
  // depuis cet écran : ce serait le moyen le plus simple de se verrouiller dehors.
  if (!before || before.role !== 'CLIENT') return;

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  if (!isActive) {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await audit(
    actor,
    isActive ? 'customer.enable' : 'customer.disable',
    'User',
    userId,
    { isActive: before.isActive },
    { isActive },
  );
}

// ─────────────────────────────── Journal d'audit ───────────────────────────────

export interface AuditEntry {
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly actorName: string;
  readonly createdAt: Date;
}

export async function listAuditLog(limit = 30): Promise<readonly AuditEntry[]> {
  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
  });

  return rows.map((row) => ({
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorName: row.actor?.fullName ?? 'Système',
    createdAt: row.createdAt,
  }));
}
