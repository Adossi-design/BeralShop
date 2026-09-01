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
  /**
   * Version resserrée pour les carrousels de l'accueil : la page doit montrer
   * DEUX rangées de produits dans un seul écran. On gagne la hauteur sur ce qui
   * pèse le moins dans la décision (marque, nombre d'avis), jamais sur le prix.
   */
  readonly compact?: boolean;
}

export function ProductCard({ product, priority, compact = false }: ProductCardProps) {
  return (
    <article className="group border-border bg-surface rounded-card shadow-card hover:shadow-raised relative flex h-full flex-col overflow-hidden border transition-shadow">
      {/* CADRE CARRÉ, EN COMPACT COMME AILLEURS.
          Il était en 4/3 sur les carrousels de l'accueil pour gagner de la
          hauteur. Mais les photos de la boutique sont carrées : un quart de
          chacune disparaissait, en haut et en bas. Le cadre épouse donc leur
          proportion — la photo l'occupe alors de bord à bord, entière, sans
          bande vide. La hauteur regagnée l'a été sur le texte de la carte, pas
          sur la marchandise ; les deux rangées restent visibles d'un écran. */}
      <div className="bg-surface-muted relative aspect-square overflow-hidden">
        <ProductImage
          image={product.image}
          name={product.name}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          priority={priority ?? false}
          className="transition-transform duration-300 group-hover:scale-105"
        />

        {/* UNE SEULE étiquette, et uniquement sur les articles en promotion.
            L'étiquette « Nouveau » a été retirée : posée sur presque chaque
            vignette d'un catalogue récent, elle ne distinguait plus rien et ne
            faisait que recouvrir la photo. Le pourcentage de remise, lui, porte
            une information que le client cherche vraiment. */}
        {product.price.isOnSale ? (
          <span className="bg-sale-500 absolute start-2 top-2 rounded px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
            −{product.price.discountPercent} %
          </span>
        ) : null}

        {!product.isAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
            <span className="bg-ink-900 rounded px-2.5 py-1 text-xs font-semibold text-white">
              Rupture de stock
            </span>
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-0.5 p-2' : 'gap-1 p-2.5'}`}>
        {!compact && product.brandName ? (
          <p className="text-content-muted text-[0.7rem] tracking-wide uppercase">
            {product.brandName}
          </p>
        ) : null}

        <h3
          className={`text-content leading-snug font-medium ${
            compact ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm'
          }`}
        >
          {/* `after:absolute inset-0` étend la zone cliquable à toute la carte sans
              imbriquer plusieurs liens — un seul élément focalisable au clavier. */}
          <Link
            href={`/produits/${product.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        {/* En vue compacte, les étoiles sautent aussi : chaque ligne de moins,
            multipliée par deux rangées, décide si la seconde rangée est visible.
            La note reste sur la fiche produit, où se joue la comparaison. */}
        {!compact ? <StarRating value={product.ratingAvg} count={product.ratingCount} /> : null}

        {/* `mt-auto` colle le prix en bas : toutes les cartes s'alignent. */}
        <div className={`mt-auto ${compact ? 'pt-0.5' : 'pt-1.5'}`}>
          <Price price={product.price} showFrom={product.hasMultiplePrices} size="sm" />
        </div>
      </div>
    </article>
  );
}
