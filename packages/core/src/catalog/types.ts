import type { Locale } from '@beralshopp/shared';

import type { PriceView } from '../pricing/product-price.ts';

/**
 * Types du domaine catalogue.
 *
 * Ce sont ces objets — et non les lignes Prisma — que manipulent les pages et l'API.
 * Trois bénéfices : le stockage peut changer sans casser l'affichage, aucune donnée
 * interne ne fuit vers le navigateur, et l'application mobile consommera exactement
 * la même forme.
 */

export interface CategorySummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly iconName: string | null;
  readonly productCount?: number;
}

export interface CategoryNode extends CategorySummary {
  readonly children: readonly CategoryNode[];
}

export interface ProductImageView {
  readonly url: string;
  readonly altText: string;
  readonly width: number | null;
  readonly height: number | null;
}

export interface VariantView {
  readonly id: string;
  readonly sku: string;
  /** { "couleur": "Noir", "taille": "M" } */
  readonly options: Readonly<Record<string, string>>;
  readonly price: PriceView;
  /** Stock réellement vendable : quantité physique moins réservations en cours. */
  readonly availableQuantity: number;
  readonly isAvailable: boolean;
}

/** Forme allégée, pour les grilles et les carrousels. */
export interface ProductSummary {
  readonly id: string;
  readonly slug: string;
  readonly sku: string;
  readonly name: string;
  readonly brandName: string | null;
  readonly categorySlug: string | null;
  readonly image: ProductImageView | null;
  readonly price: PriceView;
  /** Vrai si les variantes n'ont pas toutes le même prix → afficher « à partir de ». */
  readonly hasMultiplePrices: boolean;
  readonly isAvailable: boolean;
  readonly isNew: boolean;
  readonly ratingAvg: number;
  readonly ratingCount: number;
  readonly salesCount: number;
}

/** Forme complète, pour la fiche produit. */
export interface ProductDetail extends ProductSummary {
  readonly description: string | null;
  /** { "Autonomie": "8 h", "Bluetooth": "5.3" } */
  readonly specifications: Readonly<Record<string, string>>;
  readonly images: readonly ProductImageView[];
  readonly variants: readonly VariantView[];
  /** Noms des axes de choix, dans l'ordre d'affichage : ["couleur", "taille"]. */
  readonly optionNames: readonly string[];
  readonly categoryPath: readonly CategorySummary[];
  readonly totalAvailableQuantity: number;
}

export interface ProductListOptions {
  readonly locale?: Locale;
  readonly categorySlug?: string;
  readonly brandSlug?: string;
  readonly sort?: ProductSort;
  readonly limit?: number;
  /** Identifiant du dernier produit de la page précédente. Jamais un OFFSET. */
  readonly cursor?: string;
  readonly onSaleOnly?: boolean;
  readonly inStockOnly?: boolean;
  readonly newWithinDays?: number;
  readonly excludeProductId?: string;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'best_rated';

export interface ProductPage {
  readonly items: readonly ProductSummary[];
  /** À repasser en `cursor` pour la page suivante. `null` = fin de liste. */
  readonly nextCursor: string | null;
}

/** Un produit est « nouveau » pendant 30 jours après sa publication. */
export const NEW_PRODUCT_WINDOW_DAYS = 30;
