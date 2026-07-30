import { prisma } from '@beralshopp/db';
import { BASE_CURRENCY, type CurrencyCode, type Money, money } from '@beralshopp/shared';

/**
 * Statistiques du tableau de bord.
 *
 * ⚠️ LE CHIFFRE D'AFFAIRES NE COMPTE QUE LES COMMANDES ENCAISSÉES.
 *
 * Inclure les commandes en attente de paiement gonflerait artificiellement le
 * résultat : beaucoup ne seront jamais payées. Un tableau de bord qui ment sur le
 * chiffre d'affaires conduit à des décisions de stock et de trésorerie erronées.
 *
 * Statuts comptés comme encaissés : PAID, PROCESSING, SHIPPED, OUT_FOR_DELIVERY,
 * DELIVERED. Les remboursements sont exclus.
 */

const REVENUE_STATUSES = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export interface PeriodStats {
  readonly revenue: Money;
  readonly orderCount: number;
  readonly itemsSold: number;
  readonly averageBasket: Money;
}

export interface TopProduct {
  readonly sku: string;
  readonly name: string;
  readonly quantitySold: number;
  readonly revenue: Money;
}

export interface DashboardStats {
  readonly today: PeriodStats;
  readonly last30Days: PeriodStats;
  readonly allTime: PeriodStats;

  /** Commandes payées qui attendent une action de l'équipe. */
  readonly toProcess: number;
  /** Commandes en attente de paiement, encore dans le délai. */
  readonly awaitingPayment: number;

  readonly customerCount: number;
  readonly newCustomers30Days: number;

  readonly activeProducts: number;
  /** Variantes actives dont le stock vendable est nul. */
  readonly outOfStockVariants: number;
  /** Variantes sous leur seuil d'alerte. */
  readonly lowStockVariants: number;

  readonly topProducts: readonly TopProduct[];
}

function toMoney(amountMinor: number): Money {
  return money(Math.round(amountMinor), BASE_CURRENCY as CurrencyCode);
}

async function periodStats(since?: Date): Promise<PeriodStats> {
  const where = {
    status: { in: [...REVENUE_STATUSES] },
    ...(since ? { paidAt: { gte: since } } : {}),
  };

  const [aggregate, items] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: { totalMinor: true },
      _count: { _all: true },
    }),
    prisma.orderItem.aggregate({
      where: { order: where },
      _sum: { quantity: true },
    }),
  ]);

  const revenue = aggregate._sum.totalMinor ?? 0;
  const orderCount = aggregate._count._all;

  return {
    revenue: toMoney(revenue),
    orderCount,
    itemsSold: items._sum.quantity ?? 0,
    // Division entière : un panier moyen s'exprime en francs entiers, pas en fractions.
    averageBasket: toMoney(orderCount > 0 ? revenue / orderCount : 0),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    today,
    last30Days,
    allTime,
    toProcess,
    awaitingPayment,
    customerCount,
    newCustomers30Days,
    activeProducts,
    topRows,
  ] = await Promise.all([
    periodStats(startOfToday),
    periodStats(thirtyDaysAgo),
    periodStats(),
    prisma.order.count({ where: { status: { in: ['PAID', 'PROCESSING'] } } }),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.orderItem.groupBy({
      by: ['skuSnapshot', 'productNameSnapshot'],
      where: { order: { status: { in: [...REVENUE_STATUSES] } } },
      _sum: { quantity: true, lineTotalMinor: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
  ]);

  // Le stock vendable compare deux colonnes : Prisma ne sait pas l'exprimer dans un
  // `count`, d'où ces deux requêtes brutes.
  const [outOfStock] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM product_variants
    WHERE "isActive" AND "stockQuantity" - "reservedQuantity" <= 0
  `;
  const [lowStock] = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM product_variants
    WHERE "isActive"
      AND "stockQuantity" - "reservedQuantity" > 0
      AND "stockQuantity" - "reservedQuantity" <= "lowStockThreshold"
  `;

  return {
    today,
    last30Days,
    allTime,
    toProcess,
    awaitingPayment,
    customerCount,
    newCustomers30Days,
    activeProducts,
    outOfStockVariants: Number(outOfStock?.n ?? 0),
    lowStockVariants: Number(lowStock?.n ?? 0),
    topProducts: topRows.map((row) => ({
      sku: row.skuSnapshot,
      name: row.productNameSnapshot,
      quantitySold: row._sum.quantity ?? 0,
      revenue: toMoney(row._sum.lineTotalMinor ?? 0),
    })),
  };
}

/** Variantes à réapprovisionner, pour l'alerte du tableau de bord. */
export interface LowStockVariant {
  readonly variantId: string;
  readonly sku: string;
  readonly productName: string;
  readonly productSlug: string;
  readonly available: number;
  readonly threshold: number;
}

export async function listLowStock(limit = 10): Promise<readonly LowStockVariant[]> {
  return prisma.$queryRaw<LowStockVariant[]>`
    SELECT v.id            AS "variantId",
           v.sku           AS sku,
           COALESCE(pt.name, p.sku) AS "productName",
           p.slug          AS "productSlug",
           v."stockQuantity" - v."reservedQuantity" AS available,
           v."lowStockThreshold" AS threshold
    FROM product_variants v
    JOIN products p ON p.id = v."productId"
    LEFT JOIN product_translations pt
      ON pt."productId" = p.id AND pt.locale = 'fr'
    WHERE v."isActive"
      AND p.status = 'ACTIVE'
      AND v."stockQuantity" - v."reservedQuantity" <= v."lowStockThreshold"
    ORDER BY available ASC, "productName" ASC
    LIMIT ${limit}
  `;
}
