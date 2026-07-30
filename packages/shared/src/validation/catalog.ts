import { z } from 'zod';

import { currencySchema, paginationSchema, quantitySchema, slugSchema } from './common.ts';

/** Tris proposés sur les pages catégorie et résultats de recherche. */
export const PRODUCT_SORTS = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'best_selling',
  'best_rated',
] as const;

export const productSortSchema = z.enum(PRODUCT_SORTS);
export type ProductSort = z.infer<typeof productSortSchema>;

/**
 * Filtres du catalogue et de la recherche.
 * Correspond au cahier des charges : prix, catégorie, disponibilité, nouveautés,
 * meilleures ventes, promotions.
 */
export const productFiltersSchema = z.object({
  /** Texte libre : nom, catégorie, marque, mots-clés ou référence produit. */
  q: z.string().trim().max(120).optional(),
  categorySlug: slugSchema.optional(),
  brandSlug: slugSchema.optional(),
  /** Bornes de prix exprimées dans la devise d'affichage, en plus petite unité. */
  priceMinMinor: z.number().int().min(0).optional(),
  priceMaxMinor: z.number().int().min(0).optional(),
  currency: currencySchema.optional(),
  /** N'afficher que les produits réellement disponibles. */
  inStockOnly: z.boolean().optional(),
  /** N'afficher que les produits en promotion. */
  onSaleOnly: z.boolean().optional(),
  /** Nouveautés : ajoutées dans les N derniers jours. */
  newWithinDays: z.number().int().min(1).max(365).optional(),
  sort: productSortSchema.default('relevance'),
});

export const productSearchSchema = productFiltersSchema
  .extend(paginationSchema.shape)
  .refine(
    (value) =>
      value.priceMinMinor === undefined ||
      value.priceMaxMinor === undefined ||
      value.priceMinMinor <= value.priceMaxMinor,
    { message: 'Le prix minimum ne peut pas dépasser le prix maximum.', path: ['priceMinMinor'] },
  );

export type ProductFilters = z.infer<typeof productFiltersSchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;

/** Ajout au panier. La quantité est plafonnée et le prix n'est JAMAIS transmis. */
export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: quantitySchema,
});

export const updateCartItemSchema = z.object({
  cartItemId: z.string().min(1),
  /** 0 supprime la ligne. */
  quantity: z.number().int().min(0).max(999),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
