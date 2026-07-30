import { PackageSearch } from 'lucide-react';

import type { ProductSummary } from '@beralshopp/core';

import { ProductCard } from './product-card';

/**
 * Grille de produits.
 * Deux colonnes sur téléphone : c'est la densité attendue sur les plateformes de vente
 * en ligne africaines, et elle limite le défilement sur petit écran.
 */
export function ProductGrid({
  products,
  emptyMessage = 'Aucun produit ne correspond pour le moment.',
}: {
  readonly products: readonly ProductSummary[];
  readonly emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="border-border bg-surface-muted/50 rounded-card border border-dashed px-6 py-14 text-center">
        <PackageSearch className="text-content-muted mx-auto h-8 w-8" aria-hidden />
        <p className="text-content-muted mt-3 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Carrousel horizontal pour la page d'accueil.
 * Défilement natif avec points d'accroche : aucun JavaScript, donc aucun coût sur le
 * temps d'affichage — un carrousel en JavaScript est l'une des principales causes de
 * lenteur des pages d'accueil marchandes.
 */
export function ProductRail({ products }: { readonly products: readonly ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <ul className="-mx-1 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-1 pb-2 [&::-webkit-scrollbar]:hidden">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%] xl:w-[18.5%]"
        >
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
