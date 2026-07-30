import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb, SearchX } from 'lucide-react';

import { type SearchSort, listCategoryTree, searchProducts } from '@beralshopp/core';

import { ProductGrid } from '@/components/catalog/product-grid';

/**
 * Page de résultats de recherche.
 *
 * Non indexée : une page de résultats n'apporte rien à Google et diluerait le
 * référencement des fiches produits, qui sont les pages qui doivent ressortir.
 * En revanche elle reste partageable — tri et filtres vivent dans l'URL.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

const SORT_OPTIONS: readonly { value: string; sort: SearchSort; label: string }[] = [
  { value: 'pertinence', sort: 'relevance', label: 'Pertinence' },
  { value: 'meilleures-ventes', sort: 'best_selling', label: 'Meilleures ventes' },
  { value: 'nouveautes', sort: 'newest', label: 'Nouveautés' },
  { value: 'prix-croissant', sort: 'price_asc', label: 'Prix croissant' },
  { value: 'prix-decroissant', sort: 'price_desc', label: 'Prix décroissant' },
];

/** Tranches de prix en francs rwandais, calées sur le panier moyen visé. */
const PRICE_BANDS: readonly { value: string; label: string; min?: number; max?: number }[] = [
  { value: '0-10000', label: 'Moins de 10 000 Frw', max: 10_000 },
  { value: '10000-25000', label: '10 000 – 25 000 Frw', min: 10_000, max: 25_000 },
  { value: '25000-50000', label: '25 000 – 50 000 Frw', min: 25_000, max: 50_000 },
  { value: '50000-', label: 'Plus de 50 000 Frw', min: 50_000 },
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const query = (single(params['q']) ?? '').trim();
  const sortParam = single(params['tri']);
  const selectedSort = SORT_OPTIONS.find((o) => o.value === sortParam) ?? SORT_OPTIONS[0]!;
  const categorySlug = single(params['categorie']);
  const bandValue = single(params['prix']);
  const band = PRICE_BANDS.find((b) => b.value === bandValue);
  const inStockOnly = params['dispo'] === '1';
  const onSaleOnly = params['promo'] === '1';
  const cursor = single(params['apres']);

  const [results, categories] = await Promise.all([
    searchProducts({
      query,
      sort: selectedSort.sort,
      inStockOnly,
      onSaleOnly,
      ...(categorySlug ? { categorySlug } : {}),
      ...(band?.min !== undefined ? { priceMinMinor: band.min } : {}),
      ...(band?.max !== undefined ? { priceMaxMinor: band.max } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 24,
    }),
    listCategoryTree(),
  ]);

  /** Conserve les filtres actifs en changeant un seul paramètre. */
  function buildHref(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (sortParam) next.set('tri', sortParam);
    if (categorySlug) next.set('categorie', categorySlug);
    if (bandValue) next.set('prix', bandValue);
    if (inStockOnly) next.set('dispo', '1');
    if (onSaleOnly) next.set('promo', '1');

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    // Le curseur n'est jamais reporté : changer un filtre doit ramener page 1.
    return `/recherche?${next.toString()}`;
  }

  const hasFilters = Boolean(categorySlug || bandValue || inStockOnly || onSaleOnly);

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <h1 className="text-content text-xl font-bold sm:text-2xl">
        {query ? (
          <>
            Résultats pour <span className="text-gold-700">« {query} »</span>
          </>
        ) : (
          'Rechercher un produit'
        )}
      </h1>

      {query ? (
        <p className="text-content-muted mt-1 text-sm">
          {results.total === 0
            ? 'Aucun produit trouvé'
            : `${results.total} produit${results.total > 1 ? 's' : ''} trouvé${results.total > 1 ? 's' : ''}`}
        </p>
      ) : (
        <p className="text-content-muted mt-1 text-sm">
          Saisissez un nom de produit, une marque, une catégorie ou une référence.
        </p>
      )}

      {/* Le repêchage est signalé : sans cela, le client croit avoir bien tapé
          et ne comprend pas pourquoi les résultats semblent à côté. */}
      {results.usedFuzzyFallback ? (
        <p className="border-gold-300 bg-gold-50 text-gold-900 rounded-control mt-4 flex items-start gap-2 border px-4 py-3 text-sm">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Aucun résultat exact pour « {query} ». Voici les produits les plus proches.</span>
        </p>
      ) : null}

      {query ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr]">
          {/* ——— Filtres ——— */}
          <aside className="lg:sticky lg:top-40 lg:self-start">
            <div className="flex items-center justify-between">
              <h2 className="text-content text-sm font-semibold">Affiner</h2>
              {hasFilters ? (
                <Link
                  href={`/recherche?q=${encodeURIComponent(query)}`}
                  className="text-gold-700 text-xs hover:underline"
                >
                  Tout effacer
                </Link>
              ) : null}
            </div>

            <div className="mt-4 space-y-5">
              <fieldset>
                <legend className="text-content-muted mb-2 text-xs font-medium tracking-wide uppercase">
                  Disponibilité
                </legend>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildHref({ dispo: inStockOnly ? undefined : '1' })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      inStockOnly
                        ? 'border-ink-900 bg-ink-900 text-white'
                        : 'border-border text-content-muted hover:border-gold-400'
                    }`}
                  >
                    En stock
                  </Link>
                  <Link
                    href={buildHref({ promo: onSaleOnly ? undefined : '1' })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      onSaleOnly
                        ? 'border-sale-500 bg-sale-500 text-white'
                        : 'border-border text-content-muted hover:border-gold-400'
                    }`}
                  >
                    En promotion
                  </Link>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-content-muted mb-2 text-xs font-medium tracking-wide uppercase">
                  Prix
                </legend>
                <ul className="space-y-1.5">
                  {PRICE_BANDS.map((option) => {
                    const isActive = option.value === bandValue;
                    return (
                      <li key={option.value}>
                        <Link
                          href={buildHref({ prix: isActive ? undefined : option.value })}
                          className={`block text-sm transition-colors ${
                            isActive
                              ? 'text-gold-700 font-semibold'
                              : 'text-content-muted hover:text-gold-700'
                          }`}
                        >
                          {isActive ? '✓ ' : ''}
                          {option.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <fieldset>
                <legend className="text-content-muted mb-2 text-xs font-medium tracking-wide uppercase">
                  Catégorie
                </legend>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pe-1">
                  {categories.map((category) => {
                    const isActive = category.slug === categorySlug;
                    return (
                      <li key={category.slug}>
                        <Link
                          href={buildHref({ categorie: isActive ? undefined : category.slug })}
                          className={`block text-sm transition-colors ${
                            isActive
                              ? 'text-gold-700 font-semibold'
                              : 'text-content-muted hover:text-gold-700'
                          }`}
                        >
                          {isActive ? '✓ ' : ''}
                          {category.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            </div>
          </aside>

          {/* ——— Résultats ——— */}
          <div>
            <div className="border-border flex flex-wrap items-center gap-2 border-b pb-3">
              <span className="text-content-muted text-xs font-medium">Trier :</span>
              {SORT_OPTIONS.map((option) => {
                const isActive = option.value === selectedSort.value;
                return (
                  <Link
                    key={option.value}
                    href={buildHref({ tri: option.value })}
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
              {results.items.length === 0 ? (
                <div className="border-border bg-surface-muted/50 rounded-card border border-dashed px-6 py-14 text-center">
                  <SearchX className="text-content-muted mx-auto h-8 w-8" aria-hidden />
                  <p className="text-content mt-3 font-medium">
                    Aucun produit ne correspond à « {query} »
                  </p>
                  <ul className="text-content-muted mx-auto mt-3 max-w-sm space-y-1 text-start text-sm">
                    <li>• Vérifiez l’orthographe</li>
                    <li>• Essayez avec moins de mots</li>
                    <li>• Utilisez un terme plus général</li>
                    {hasFilters ? <li>• Retirez un ou plusieurs filtres</li> : null}
                  </ul>
                  <Link
                    href="/categories"
                    className="text-gold-700 mt-5 inline-block text-sm font-medium hover:underline"
                  >
                    Parcourir toutes les catégories →
                  </Link>
                </div>
              ) : (
                <ProductGrid products={results.items} />
              )}
            </div>

            {results.nextCursor ? (
              <div className="mt-8 text-center">
                <Link
                  href={`${buildHref({})}&apres=${encodeURIComponent(results.nextCursor)}`}
                  className="border-border text-content hover:border-gold-400 hover:text-gold-700 rounded-control inline-block border px-6 py-2.5 text-sm font-medium transition-colors"
                >
                  Voir plus de résultats
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
