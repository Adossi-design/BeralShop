import Link from 'next/link';

import { type ProductSort, listProducts } from '@beralshopp/core';

import { ProductGrid } from './product-grid';

/**
 * Page de liste marchande.
 *
 * Mutualisée entre Promotions, Nouveautés et Meilleures ventes : ces trois pages
 * ne diffèrent que par un filtre et un titre. Les dupliquer garantirait qu'un jour
 * l'une d'elles cesse d'être mise à jour comme les autres.
 */

const SORT_OPTIONS: readonly { value: string; sort: ProductSort; label: string }[] = [
  { value: 'meilleures-ventes', sort: 'best_selling', label: 'Meilleures ventes' },
  { value: 'nouveautes', sort: 'newest', label: 'Nouveautés' },
  { value: 'prix-croissant', sort: 'price_asc', label: 'Prix croissant' },
  { value: 'prix-decroissant', sort: 'price_desc', label: 'Prix décroissant' },
  { value: 'mieux-notes', sort: 'best_rated', label: 'Mieux notés' },
];

export interface ProductListingProps {
  readonly basePath: string;
  readonly title: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly defaultSort: ProductSort;
  readonly filters?: {
    readonly onSaleOnly?: boolean;
    readonly newWithinDays?: number;
    readonly inStockOnly?: boolean;
  };
  readonly searchParams: Record<string, string | string[] | undefined>;
}

export async function ProductListing({
  basePath,
  title,
  description,
  emptyMessage,
  defaultSort,
  filters = {},
  searchParams,
}: ProductListingProps) {
  const sortParam = typeof searchParams['tri'] === 'string' ? searchParams['tri'] : undefined;
  const selected = SORT_OPTIONS.find((option) => option.value === sortParam);
  const cursor = typeof searchParams['apres'] === 'string' ? searchParams['apres'] : undefined;

  const page = await listProducts({
    sort: selected?.sort ?? defaultSort,
    ...(filters.onSaleOnly ? { onSaleOnly: true } : {}),
    ...(filters.inStockOnly ? { inStockOnly: true } : {}),
    ...(filters.newWithinDays ? { newWithinDays: filters.newWithinDays } : {}),
    ...(cursor ? { cursor } : {}),
    limit: 24,
  });

  function href(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    if (sortParam) next.set('tri', sortParam);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return `${basePath}${qs ? `?${qs}` : ''}`;
  }

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <h1 className="text-content text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="text-content-muted mt-1 text-sm">{description}</p>

      <div className="border-border mt-6 flex flex-wrap items-center gap-2 border-y py-3">
        <span className="text-content-muted text-xs font-medium">Trier :</span>
        {SORT_OPTIONS.map((option) => {
          const isActive = option.value === (selected?.value ?? '');
          return (
            <Link
              key={option.value}
              href={href({ tri: option.value, apres: undefined })}
              aria-current={isActive ? 'true' : undefined}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                isActive
                  ? 'bg-gold-50 text-gold-800 font-semibold'
                  : 'text-content-muted hover:text-gold-700'
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <ProductGrid products={page.items} emptyMessage={emptyMessage} />
      </div>

      {page.nextCursor ? (
        <div className="mt-8 text-center">
          <Link
            href={href({ apres: page.nextCursor })}
            className="border-border text-content hover:border-gold-400 hover:text-gold-700 rounded-control inline-block border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Voir plus de produits
          </Link>
        </div>
      ) : null}
    </main>
  );
}
