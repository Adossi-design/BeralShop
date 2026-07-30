import { prisma } from '@beralshopp/db';
import { DEFAULT_LOCALE, type Locale } from '@beralshopp/shared';

import { type ProductRow, toProductDetail, toProductSummary } from './mappers.ts';
import type {
  CategoryNode,
  CategorySummary,
  ProductDetail,
  ProductListOptions,
  ProductPage,
  ProductSort,
  ProductSummary,
} from './types.ts';

/**
 * Service catalogue.
 *
 * Seul endroit du projet autorisé à interroger les tables du catalogue. Les pages et
 * les routes API appellent ces fonctions et rien d'autre — c'est ce qui permettra
 * d'extraire l'API dans un service dédié sans réécrire l'affichage.
 */

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

/** Champs chargés pour tout produit. Un seul endroit à modifier. */
const PRODUCT_INCLUDE = {
  brand: { select: { name: true } },
  category: { select: { slug: true } },
  translations: true,
  images: { orderBy: { position: 'asc' } },
  variants: { where: { isActive: true }, orderBy: { priceDeltaMinor: 'asc' } },
} as const;

function pageSize(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_PAGE_SIZE);
}

/**
 * Tri SQL. L'identifiant est systématiquement ajouté en dernier critère : sans lui,
 * deux produits de même prix pourraient s'échanger entre deux pages et l'un des deux
 * ne jamais s'afficher.
 */
function orderByFor(sort: ProductSort) {
  switch (sort) {
    case 'price_asc':
      return [{ basePriceMinor: 'asc' as const }, { id: 'asc' as const }];
    case 'price_desc':
      return [{ basePriceMinor: 'desc' as const }, { id: 'asc' as const }];
    case 'best_selling':
      return [{ salesCount: 'desc' as const }, { id: 'asc' as const }];
    case 'best_rated':
      return [
        { ratingAvg: 'desc' as const },
        { ratingCount: 'desc' as const },
        { id: 'asc' as const },
      ];
    case 'newest':
    default:
      return [{ publishedAt: 'desc' as const }, { id: 'asc' as const }];
  }
}

function buildWhere(options: ProductListOptions) {
  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    publishedAt: { not: null },
  };

  if (options.categorySlug) {
    where['category'] = { slug: options.categorySlug };
  }
  if (options.brandSlug) {
    where['brand'] = { slug: options.brandSlug };
  }
  if (options.excludeProductId) {
    where['id'] = { not: options.excludeProductId };
  }

  if (options.onSaleOnly) {
    // Comparaison entre deux colonnes de la même ligne : une promotion n'existe que
    // si l'ancien prix est réellement supérieur au prix courant.
    where['compareAtPriceMinor'] = { gt: prisma.product.fields.basePriceMinor };
  }

  if (options.inStockOnly) {
    // Le stock vendable est `stockQuantity - reservedQuantity`. On compare donc les
    // deux colonnes plutôt que de tester `stockQuantity > 0`, qui ferait apparaître
    // des produits entièrement réservés par des commandes en attente de paiement.
    where['variants'] = {
      some: {
        isActive: true,
        stockQuantity: { gt: prisma.productVariant.fields.reservedQuantity },
      },
    };
  }

  if (options.newWithinDays) {
    const since = new Date(Date.now() - options.newWithinDays * 24 * 60 * 60 * 1000);
    where['publishedAt'] = { gte: since };
  }

  return where;
}

/**
 * Liste paginée par CURSEUR, jamais par OFFSET.
 * Avec `OFFSET`, la page 500 d'un catalogue de 50 000 produits met plusieurs secondes ;
 * avec un curseur, elle reste aussi rapide que la page 1.
 */
export async function listProducts(options: ProductListOptions = {}): Promise<ProductPage> {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const take = pageSize(options.limit);

  const rows = await prisma.product.findMany({
    where: buildWhere(options),
    orderBy: orderByFor(options.sort ?? 'newest'),
    include: PRODUCT_INCLUDE,
    take: take + 1, // une ligne de plus : sert uniquement à savoir s'il reste une page
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    items: page.map((row) => toProductSummary(row as unknown as ProductRow, locale)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getProductBySlug(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', publishedAt: { not: null } },
    include: { ...PRODUCT_INCLUDE, category: { select: { slug: true, id: true } } },
  });

  if (!row) return null;

  const categoryPath = row.categoryId ? await getCategoryPath(row.categoryId, locale) : [];
  return toProductDetail(row as unknown as ProductRow, locale, categoryPath);
}

/** Produits similaires : même catégorie, les mieux vendus, produit courant exclu. */
export async function listSimilarProducts(
  product: Pick<ProductDetail, 'id' | 'categorySlug'>,
  locale: Locale = DEFAULT_LOCALE,
  limit = 8,
): Promise<readonly ProductSummary[]> {
  if (!product.categorySlug) return [];

  const { items } = await listProducts({
    locale,
    categorySlug: product.categorySlug,
    excludeProductId: product.id,
    sort: 'best_selling',
    limit,
  });
  return items;
}

// ─────────────────────────────── Catégories ───────────────────────────────

interface CategoryRow {
  id: string;
  slug: string;
  parentId: string | null;
  position: number;
  imageUrl: string | null;
  iconName: string | null;
  translations: { locale: string; name: string }[];
  _count?: { products: number };
}

function categoryName(row: CategoryRow, locale: Locale): string {
  return (
    row.translations.find((t) => t.locale === locale)?.name ??
    row.translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ??
    row.translations[0]?.name ??
    row.slug
  );
}

function toCategorySummary(row: CategoryRow, locale: Locale): CategorySummary {
  return {
    id: row.id,
    slug: row.slug,
    name: categoryName(row, locale),
    imageUrl: row.imageUrl,
    iconName: row.iconName,
    ...(row._count ? { productCount: row._count.products } : {}),
  };
}

/**
 * Arborescence complète des catégories actives.
 * Chargée en une seule requête puis assemblée en mémoire : la table compte quelques
 * dizaines de lignes, une requête récursive serait plus coûteuse que le tri local.
 */
export async function listCategoryTree(
  locale: Locale = DEFAULT_LOCALE,
): Promise<readonly CategoryNode[]> {
  const rows = (await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { slug: 'asc' }],
    include: {
      translations: { select: { locale: true, name: true } },
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
  })) as unknown as CategoryRow[];

  const nodes = new Map<string, CategoryNode & { children: CategoryNode[] }>();
  for (const row of rows) {
    nodes.set(row.id, { ...toCategorySummary(row, locale), children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export async function getCategoryBySlug(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CategorySummary | null> {
  const row = (await prisma.category.findFirst({
    where: { slug, isActive: true },
    include: {
      translations: { select: { locale: true, name: true } },
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
  })) as unknown as CategoryRow | null;

  return row ? toCategorySummary(row, locale) : null;
}

/** Chemin racine → catégorie, pour le fil d'Ariane. */
export async function getCategoryPath(
  categoryId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<readonly CategorySummary[]> {
  const rows = (await prisma.category.findMany({
    where: { isActive: true },
    include: { translations: { select: { locale: true, name: true } } },
  })) as unknown as CategoryRow[];

  const byId = new Map(rows.map((row) => [row.id, row]));
  const path: CategorySummary[] = [];

  let current = byId.get(categoryId);
  // Garde-fou : une arborescence corrompue (cycle) ne doit jamais boucler à l'infini.
  let guard = 0;
  while (current && guard < 20) {
    path.unshift(toCategorySummary(current, locale));
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }

  return path;
}

// ─────────────────────── Sélections de la page d'accueil ───────────────────────

export function listBestSellers(locale?: Locale, limit = 12): Promise<ProductPage> {
  return listProducts({ locale, sort: 'best_selling', limit, inStockOnly: true });
}

export function listNewArrivals(locale?: Locale, limit = 12): Promise<ProductPage> {
  return listProducts({ locale, sort: 'newest', limit, inStockOnly: true });
}

export function listOnSale(locale?: Locale, limit = 12): Promise<ProductPage> {
  return listProducts({ locale, sort: 'best_selling', limit, onSaleOnly: true });
}
