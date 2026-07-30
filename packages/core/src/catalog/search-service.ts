import { Prisma, prisma } from '@beralshopp/db';
import { DEFAULT_LOCALE, type Locale } from '@beralshopp/shared';

import { type ProductRow, toProductSummary } from './mappers.ts';
import type { ProductSummary } from './types.ts';

/**
 * Service de recherche.
 *
 * Le vecteur `searchVector` est alimenté par trigger PostgreSQL et agrège, avec des
 * poids décroissants : nom du produit (A), mots-clés et référence (B), marque et
 * catégorie (C), description (D). Chercher « écouteur » remonte donc d'abord un
 * produit qui s'appelle ainsi, avant un produit dont la description le mentionne.
 *
 * Deux passes :
 *   1. recherche plein texte, insensible aux accents ;
 *   2. si elle ne donne rien, REPÊCHAGE par similarité (pg_trgm) qui rattrape les
 *      fautes de frappe — « bluetoth » trouve « Bluetooth ».
 *
 * La seconde passe n'est jamais exécutée quand la première suffit : elle est plus
 * coûteuse et moins précise.
 */

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
/**
 * Seuil du repêchage par similarité.
 *
 * ⚠️ On utilise `word_similarity` et NON `similarity`. `similarity` compare la
 * requête au nom ENTIER : « bluetoth » face à « Écouteurs Bluetooth sans fil Zentro
 * X300 » obtient un score dérisoire, parce que la mesure est diluée par tous les
 * autres mots. `word_similarity` compare la requête au meilleur fragment continu du
 * nom, ce qui est exactement le comportement attendu d'une correction de frappe.
 *
 * 0,55 laisse passer une lettre manquante ou inversée, sans ouvrir la porte à des
 * rapprochements fantaisistes.
 */
const TRIGRAM_THRESHOLD = 0.55;

export type SearchSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'best_selling';

export interface SearchOptions {
  readonly query: string;
  readonly locale?: Locale;
  readonly categorySlug?: string;
  readonly brandSlug?: string;
  readonly priceMinMinor?: number;
  readonly priceMaxMinor?: number;
  readonly inStockOnly?: boolean;
  readonly onSaleOnly?: boolean;
  readonly sort?: SearchSort;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface SearchResult {
  readonly items: readonly ProductSummary[];
  readonly nextCursor: string | null;
  /** Vrai si le résultat provient du repêchage : à signaler au client. */
  readonly usedFuzzyFallback: boolean;
  readonly total: number;
}

/**
 * Curseur de pagination : valeur de tri + identifiant, encodés ensemble.
 * L'identifiant seul ne suffirait pas — deux produits peuvent partager le même
 * score de pertinence ou le même prix, et l'un des deux serait alors sauté.
 */
function encodeCursor(sortValue: number, id: string): string {
  return Buffer.from(`${sortValue}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { sortValue: number; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = raw.indexOf('|');
    if (separator < 1) return null;
    const sortValue = Number(raw.slice(0, separator));
    const id = raw.slice(separator + 1);
    if (!Number.isFinite(sortValue) || id.length === 0) return null;
    return { sortValue, id };
  } catch {
    return null;
  }
}

function pageSize(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.trunc(limit)), MAX_PAGE_SIZE);
}

/** Filtres communs aux deux passes, exprimés en SQL paramétré. */
function buildFilters(options: SearchOptions): Prisma.Sql[] {
  const filters: Prisma.Sql[] = [
    Prisma.sql`p.status = 'ACTIVE'`,
    Prisma.sql`p."publishedAt" IS NOT NULL`,
  ];

  if (options.categorySlug) {
    // Inclut les sous-catégories : filtrer sur « Électronique » doit conserver
    // les produits rangés dans « Électronique > Audio ».
    filters.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM categories c
        LEFT JOIN categories parent ON parent.id = c."parentId"
        WHERE c.id = p."categoryId"
          AND (c.slug = ${options.categorySlug} OR parent.slug = ${options.categorySlug})
      )`,
    );
  }

  if (options.brandSlug) {
    filters.push(
      Prisma.sql`EXISTS (SELECT 1 FROM brands b WHERE b.id = p."brandId" AND b.slug = ${options.brandSlug})`,
    );
  }

  if (options.priceMinMinor !== undefined) {
    filters.push(Prisma.sql`p."basePriceMinor" >= ${options.priceMinMinor}`);
  }
  if (options.priceMaxMinor !== undefined) {
    filters.push(Prisma.sql`p."basePriceMinor" <= ${options.priceMaxMinor}`);
  }

  if (options.onSaleOnly) {
    filters.push(Prisma.sql`p."compareAtPriceMinor" > p."basePriceMinor"`);
  }

  if (options.inStockOnly) {
    // Stock vendable = physique moins réservé par des commandes non payées.
    filters.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM product_variants v
        WHERE v."productId" = p.id AND v."isActive"
          AND v."stockQuantity" > v."reservedQuantity"
      )`,
    );
  }

  return filters;
}

/** Expression de tri, et colonne servant de clé de pagination. */
function buildOrder(sort: SearchSort): { column: Prisma.Sql; direction: 'DESC' | 'ASC' } {
  switch (sort) {
    case 'price_asc':
      return { column: Prisma.sql`"basePriceMinor"`, direction: 'ASC' };
    case 'price_desc':
      return { column: Prisma.sql`"basePriceMinor"`, direction: 'DESC' };
    case 'newest':
      return { column: Prisma.sql`EXTRACT(EPOCH FROM "publishedAt")`, direction: 'DESC' };
    case 'best_selling':
      return { column: Prisma.sql`"salesCount"`, direction: 'DESC' };
    case 'relevance':
    default:
      return { column: Prisma.sql`rank`, direction: 'DESC' };
  }
}

interface ScoredRow {
  id: string;
  sort_value: number;
}

async function runSearch(
  options: SearchOptions,
  fuzzy: boolean,
  take: number,
): Promise<{ rows: ScoredRow[]; total: number }> {
  const filters = buildFilters(options);
  const { column, direction } = buildOrder(options.sort ?? 'relevance');
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  // Score de repêchage : meilleur fragment du nom OU des mots-clés.
  // `unaccent` des deux côtés, sinon « ecouteur » ne rattrape jamais « Écouteur ».
  const fuzzyScore = Prisma.sql`greatest(
    word_similarity(unaccent(${options.query}), unaccent(coalesce(pt.name, ''))),
    word_similarity(unaccent(${options.query}), unaccent(coalesce(pt.keywords, '')))
  )`;

  // Condition de pertinence : plein texte, ou similarité si repêchage.
  const matchCondition = fuzzy
    ? Prisma.sql`${fuzzyScore} > ${TRIGRAM_THRESHOLD}`
    : Prisma.sql`p."searchVector" @@ websearch_to_tsquery('fr_unaccent', ${options.query})`;

  const rankExpression = fuzzy
    ? fuzzyScore
    : Prisma.sql`ts_rank(p."searchVector", websearch_to_tsquery('fr_unaccent', ${options.query}))`;

  const where = Prisma.join([...filters, matchCondition], ' AND ');

  // Filtre de curseur : strictement « après » la dernière ligne rendue.
  // L'identifiant départage les ex æquo, garantissant qu'aucun produit n'est
  // ni sauté ni affiché deux fois entre deux pages.
  const cursorCondition = cursor
    ? direction === 'DESC'
      ? Prisma.sql`AND (sort_value < ${cursor.sortValue} OR (sort_value = ${cursor.sortValue} AND id > ${cursor.id}))`
      : Prisma.sql`AND (sort_value > ${cursor.sortValue} OR (sort_value = ${cursor.sortValue} AND id > ${cursor.id}))`
    : Prisma.empty;

  const orderDirection = direction === 'DESC' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const rows = await prisma.$queryRaw<ScoredRow[]>`
    WITH scored AS (
      SELECT p.id,
             ${rankExpression} AS rank,
             p."basePriceMinor",
             p."publishedAt",
             p."salesCount"
      FROM products p
      LEFT JOIN product_translations pt
        ON pt."productId" = p.id AND pt.locale = 'fr'
      WHERE ${where}
    ),
    keyed AS (
      SELECT id, (${column})::double precision AS sort_value FROM scored
    )
    SELECT id, sort_value
    FROM keyed
    WHERE TRUE ${cursorCondition}
    ORDER BY sort_value ${orderDirection}, id ASC
    LIMIT ${take + 1}
  `;

  // Le total sert au libellé « N résultats ». Il n'est calculé que sur la première
  // page : le recalculer à chaque page suivante coûterait cher pour une information
  // que le client a déjà sous les yeux.
  let total = rows.length;
  if (!cursor) {
    const counted = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n
      FROM products p
      LEFT JOIN product_translations pt
        ON pt."productId" = p.id AND pt.locale = 'fr'
      WHERE ${where}
    `;
    total = Number(counted[0]?.n ?? 0);
  }

  return { rows, total };
}

const PRODUCT_INCLUDE = {
  brand: { select: { name: true } },
  category: { select: { slug: true } },
  translations: true,
  images: { orderBy: { position: 'asc' } },
  variants: { where: { isActive: true }, orderBy: { priceDeltaMinor: 'asc' } },
} as const;

export async function searchProducts(options: SearchOptions): Promise<SearchResult> {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const take = pageSize(options.limit);
  const query = options.query.trim();

  if (query.length === 0) {
    return { items: [], nextCursor: null, usedFuzzyFallback: false, total: 0 };
  }

  let { rows, total } = await runSearch(options, false, take);
  let usedFuzzyFallback = false;

  // Repêchage uniquement si la recherche exacte ne donne rien ET qu'on est sur la
  // première page : relancer une passe différente en cours de pagination
  // mélangerait deux jeux de résultats.
  if (rows.length === 0 && !options.cursor) {
    const fallback = await runSearch(options, true, take);
    if (fallback.rows.length > 0) {
      rows = fallback.rows;
      total = fallback.total;
      usedFuzzyFallback = true;
    }
  }

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  if (page.length === 0) {
    return { items: [], nextCursor: null, usedFuzzyFallback, total: 0 };
  }

  // Deux requêtes plutôt qu'une : la première classe, la seconde hydrate.
  // Tout faire en SQL brut obligerait à reconstruire à la main variantes, images
  // et traductions, avec le risque d'incohérence que cela suppose.
  const products = await prisma.product.findMany({
    where: { id: { in: page.map((row) => row.id) } },
    include: PRODUCT_INCLUDE,
  });

  // `findMany` ne garantit aucun ordre : on rétablit celui du classement.
  const byId = new Map(products.map((product) => [product.id, product]));
  const items = page
    .map((row) => byId.get(row.id))
    .filter((product): product is NonNullable<typeof product> => product !== undefined)
    .map((product) => toProductSummary(product as unknown as ProductRow, locale));

  const last = page.at(-1);

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.sort_value, last.id) : null,
    usedFuzzyFallback,
    total,
  };
}

// ─────────────────────────────── Suggestions ───────────────────────────────

export interface Suggestion {
  readonly type: 'product' | 'category';
  readonly label: string;
  readonly href: string;
}

/**
 * Suggestions affichées pendant la saisie.
 *
 * Les catégories sont proposées AVANT les produits : quelqu'un qui tape « chauss »
 * cherche presque toujours le rayon, pas un article précis. C'est aussi le chemin le
 * plus court vers un panier plus garni.
 */
export async function suggest(rawQuery: string, limit = 8): Promise<readonly Suggestion[]> {
  const query = rawQuery.trim();
  // En dessous de deux caractères, tout remonte : la suggestion n'aide plus.
  if (query.length < 2) return [];

  const [categories, products] = await Promise.all([
    prisma.$queryRaw<{ name: string; slug: string }[]>`
      SELECT ct.name, c.slug
      FROM categories c
      JOIN category_translations ct ON ct."categoryId" = c.id AND ct.locale = 'fr'
      WHERE c."isActive"
        AND unaccent(ct.name) ILIKE unaccent(${`%${query}%`})
      ORDER BY length(ct.name) ASC
      LIMIT 3
    `,
    /**
     * ⚠️ Volontairement en ILIKE, et NON en recherche plein texte.
     *
     * `websearch_to_tsquery` compare des MOTS ENTIERS après racinisation : « ecout »
     * ne correspond à rien, alors que « écouteurs » existe. Or une autocomplétion
     * travaille par définition sur des mots incomplets — c'est tout son intérêt.
     *
     * L'ILIKE désaccentué s'appuie sur l'index trigramme déjà posé sur
     * `product_translations.name`, et le classement par `word_similarity` fait
     * remonter en premier les correspondances les plus proches du début du mot.
     */
    prisma.$queryRaw<{ name: string; slug: string }[]>`
      SELECT pt.name, p.slug
      FROM products p
      JOIN product_translations pt ON pt."productId" = p.id AND pt.locale = 'fr'
      WHERE p.status = 'ACTIVE'
        AND p."publishedAt" IS NOT NULL
        AND (
          unaccent(pt.name) ILIKE unaccent(${`%${query}%`})
          OR unaccent(coalesce(pt.keywords, '')) ILIKE unaccent(${`%${query}%`})
        )
      ORDER BY word_similarity(unaccent(${query}), unaccent(pt.name)) DESC,
               length(pt.name) ASC
      LIMIT ${limit}
    `,
  ]);

  const suggestions: Suggestion[] = [
    ...categories.map((row) => ({
      type: 'category' as const,
      label: row.name,
      href: `/categories/${row.slug}`,
    })),
    ...products.map((row) => ({
      type: 'product' as const,
      label: row.name,
      href: `/produits/${row.slug}`,
    })),
  ];

  return suggestions.slice(0, limit);
}
