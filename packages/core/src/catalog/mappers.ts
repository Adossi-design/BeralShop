import { DEFAULT_LOCALE, type Locale } from '@beralshopp/shared';

import { buildFromPriceView, buildPriceView } from '../pricing/product-price.ts';
import {
  NEW_PRODUCT_WINDOW_DAYS,
  type ProductDetail,
  type ProductImageView,
  type ProductSummary,
  type VariantView,
} from './types.ts';
import { grillePaliers } from '../pricing/price-tiers.ts';

/**
 * Conversion des lignes de base en objets du domaine.
 *
 * C'est ici, et uniquement ici, que la forme du stockage rencontre la forme de
 * l'affichage. Aucune page ne doit manipuler une ligne Prisma directement.
 */

interface TranslationRow {
  locale: string;
  name: string;
  description: string | null;
  specifications: unknown;
  keywords: string | null;
}

interface ImageRow {
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
}

interface VariantRow {
  id: string;
  sku: string;
  options: unknown;
  priceDeltaMinor: number;
  stockQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  basePriceMinor: number;
  compareAtPriceMinor: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  brand: { name: string } | null;
  category: { slug: string } | null;
  translations: TranslationRow[];
  images: ImageRow[];
  variants: VariantRow[];
  priceTiers?: { minQuantity: number; unitPriceMinor: number }[];
}

/**
 * Choisit la traduction à afficher.
 * Repli sur le français puis sur la première disponible : mieux vaut un nom dans la
 * mauvaise langue qu'un produit sans nom.
 */
function pickTranslation(
  translations: readonly TranslationRow[],
  locale: Locale,
): TranslationRow | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === DEFAULT_LOCALE) ??
    translations[0]
  );
}

function toStringRecord(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') result[key] = raw;
    else if (typeof raw === 'number' || typeof raw === 'boolean') result[key] = String(raw);
  }
  return result;
}

function mapImage(row: ImageRow, fallbackAlt: string): ProductImageView {
  return {
    url: row.url,
    altText: row.altText ?? fallbackAlt,
    width: row.width,
    height: row.height,
  };
}

function availableQuantity(variant: VariantRow): number {
  // Le stock réservé appartient à des commandes en attente de paiement : il n'est pas
  // vendable. Afficher `stockQuantity` seul conduirait à survendre.
  return Math.max(0, variant.stockQuantity - variant.reservedQuantity);
}

function isNewProduct(row: ProductRow): boolean {
  const reference = row.publishedAt ?? row.createdAt;
  const ageMs = Date.now() - reference.getTime();
  return ageMs <= NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function toProductSummary(row: ProductRow, locale: Locale): ProductSummary {
  const translation = pickTranslation(row.translations, locale);
  const name = translation?.name ?? row.sku;

  const activeVariants = row.variants.filter((v) => v.isActive);
  const price = buildFromPriceView(
    { basePriceMinor: row.basePriceMinor, compareAtPriceMinor: row.compareAtPriceMinor },
    activeVariants.map((v) => v.priceDeltaMinor),
  );

  const primaryImage =
    row.images.find((image) => image.isPrimary) ??
    [...row.images].sort((a, b) => a.position - b.position)[0];

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name,
    brandName: row.brand?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    image: primaryImage ? mapImage(primaryImage, name) : null,
    price,
    hasMultiplePrices: price.hasMultiplePrices,
    isAvailable: activeVariants.some((v) => availableQuantity(v) > 0),
    isNew: isNewProduct(row),
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    salesCount: row.salesCount,
  };
}

export function toVariantView(
  variant: VariantRow,
  row: Pick<ProductRow, 'basePriceMinor' | 'compareAtPriceMinor'>,
): VariantView {
  const available = availableQuantity(variant);
  return {
    id: variant.id,
    sku: variant.sku,
    options: toStringRecord(variant.options),
    price: buildPriceView({
      basePriceMinor: row.basePriceMinor,
      compareAtPriceMinor: row.compareAtPriceMinor,
      variantDeltaMinor: variant.priceDeltaMinor,
    }),
    availableQuantity: available,
    isAvailable: available > 0,
  };
}

export function toProductDetail(
  row: ProductRow,
  locale: Locale,
  categoryPath: ProductDetail['categoryPath'],
): ProductDetail {
  const summary = toProductSummary(row, locale);
  const translation = pickTranslation(row.translations, locale);

  const variants = row.variants.filter((v) => v.isActive).map((v) => toVariantView(v, row));

  // Ordre des axes de choix : celui de la première variante, qui est aussi l'ordre de
  // saisie dans l'admin. Un tri alphabétique donnerait « couleur » avant « taille »
  // même quand le vendeur a pensé l'inverse.
  const optionNames = variants[0] ? Object.keys(variants[0].options) : [];

  return {
    ...summary,
    description: translation?.description ?? null,
    specifications: toStringRecord(translation?.specifications),
    images: [...row.images]
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)
      .map((image) => mapImage(image, summary.name)),
    variants,
    optionNames,
    categoryPath,
    totalAvailableQuantity: variants.reduce((total, v) => total + v.availableQuantity, 0),
    /* La grille est calculée sur le prix de base, SANS écart de variante : la
       fiche l'affiche avant tout choix de couleur. Le supplément apparaît sur le
       prix principal, qui lui suit la variante sélectionnée. */
    priceTiers: grillePaliers(row.basePriceMinor, 0, row.priceTiers ?? []),
  };
}
