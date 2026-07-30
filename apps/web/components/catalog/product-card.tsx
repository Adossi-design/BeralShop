import Link from 'next/link';

import type { ProductSummary } from '@beralshopp/core';

import { Price } from './price';
import { ProductImage } from './product-image';
import { StarRating } from './star-rating';

/**
 * Carte produit — l'élément le plus répété du site.
 *
 * Contraintes tenues ici :
 *  • toute la carte est cliquable, mais un SEUL lien est exposé aux lecteurs d'écran ;
 *  • hauteur homogène quel que soit le nombre de lignes du titre, sinon la grille
 *    « saute » et paraît bâclée ;
 *  • le prix reste toujours visible, collé en bas de la carte.
 */

interface ProductCardProps {
  readonly product: ProductSummary;
  /** À activer uniquement pour les toutes premières cartes visibles sans défilement. */
  readonly priority?: boolean;
}

export function ProductCard({ product, priority }: ProductCardProps) {
  return (
    <article className="group border-border bg-surface rounded-card shadow-card hover:shadow-raised relative flex h-full flex-col overflow-hidden border transition-shadow">
      <div className="bg-surface-muted relative aspect-square overflow-hidden">
        <ProductImage
          image={product.image}
          name={product.name}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          priority={priority ?? false}
          className="transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badges — au maximum deux, pour ne pas masquer le produit. */}
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {product.price.isOnSale ? (
            <span className="bg-sale-500 rounded px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
              −{product.price.discountPercent} %
            </span>
          ) : null}
          {product.isNew && !product.price.isOnSale ? (
            <span className="bg-ink-900 rounded px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
              Nouveau
            </span>
          ) : null}
        </div>

        {!product.isAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
            <span className="bg-ink-900 rounded px-2.5 py-1 text-xs font-semibold text-white">
              Rupture de stock
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {product.brandName ? (
          <p className="text-content-muted text-[0.7rem] tracking-wide uppercase">
            {product.brandName}
          </p>
        ) : null}

        <h3 className="text-content line-clamp-2 text-sm leading-snug font-medium">
          {/* `after:absolute inset-0` étend la zone cliquable à toute la carte sans
              imbriquer plusieurs liens — un seul élément focalisable au clavier. */}
          <Link
            href={`/produits/${product.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        <StarRating value={product.ratingAvg} count={product.ratingCount} />

        {/* `mt-auto` colle le prix en bas : toutes les cartes s'alignent. */}
        <div className="mt-auto pt-1.5">
          <Price price={product.price} showFrom={product.hasMultiplePrices} size="sm" />
        </div>
      </div>
    </article>
  );
}
