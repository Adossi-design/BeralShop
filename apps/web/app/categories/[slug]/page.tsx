import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  type ProductSort,
  getCategoryPath,
  listCategoryTree,
  listProducts,
} from '@beralshopp/core';

import { getCategory } from '@/lib/request-cache';
import { Breadcrumb } from '@/components/catalog/breadcrumb';
import { ProductGrid } from '@/components/catalog/product-grid';

/**
 * Page catégorie.
 *
 * Le tri passe par l'URL (`?tri=prix-croissant`) et non par un état JavaScript :
 * la page reste partageable, indexable par Google, et fonctionne même si le
 * JavaScript n'a pas encore été chargé — fréquent en 3G.
 */
export const revalidate = 300;

const SORT_OPTIONS: readonly { value: string; sort: ProductSort; label: string }[] = [
  { value: 'nouveautes', sort: 'newest', label: 'Nouveautés' },
  { value: 'meilleures-ventes', sort: 'best_selling', label: 'Meilleures ventes' },
  { value: 'prix-croissant', sort: 'price_asc', label: 'Prix croissant' },
  { value: 'prix-decroissant', sort: 'price_desc', label: 'Prix décroissant' },
  { value: 'mieux-notes', sort: 'best_rated', label: 'Mieux notés' },
];

const DEFAULT_SORT = SORT_OPTIONS[1]!;

function resolveSort(value: string | undefined) {
  return SORT_OPTIONS.find((option) => option.value === value) ?? DEFAULT_SORT;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) return { title: 'Catégorie introuvable' };

  return {
    title: category.name,
    description: `Achetez ${category.name.toLowerCase()} sur Beralshopp. Paiement par Mobile Money ou carte, livraison au Rwanda.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const found = await getCategory(slug);
  if (!found) notFound();

  // Constante intermédiaire : TypeScript perd le rétrécissement de type d'une variable
  // capturée par une closure (ici `buildHref`). Une const réaffirme la non-nullité.
  const category = found;

  const sortParam = typeof query['tri'] === 'string' ? query['tri'] : undefined;
  const selectedSort = resolveSort(sortParam);
  const inStockOnly = query['dispo'] === '1';
  const onSaleOnly = query['promo'] === '1';
  const cursor = typeof query['apres'] === 'string' ? query['apres'] : undefined;

  const [path, tree, page] = await Promise.all([
    getCategoryPath(category.id),
    listCategoryTree(),
    listProducts({
      categorySlug: category.slug,
      sort: selectedSort.sort,
      inStockOnly,
      onSaleOnly,
      ...(cursor ? { cursor } : {}),
      limit: 24,
    }),
  ]);

  // Sous-catégories de la rubrique affichée, pour affiner sans repasser par le menu.
  const siblings =
    tree.find((node) => node.slug === category.slug)?.children ??
    tree.find((node) => node.children.some((child) => child.slug === category.slug))?.children ??
    [];

  /**
   * Conserve les filtres actifs en changeant un seul paramètre.
   * Le curseur de pagination est volontairement omis : changer un tri ou un filtre
   * doit toujours ramener à la première page, sinon on repart au milieu d'une liste
   * qui n'a plus le même ordre.
   */
  function buildHref(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    if (sortParam) next.set('tri', sortParam);
    if (inStockOnly) next.set('dispo', '1');
    if (onSaleOnly) next.set('promo', '1');

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }

    const queryString = next.toString();
    return `/categories/${category.slug}${queryString ? `?${queryString}` : ''}`;
  }

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <Breadcrumb
        items={[
          { href: '/categories', label: 'Catégories' },
          ...path.map((node) => ({ href: `/categories/${node.slug}`, label: node.name })),
        ]}
      />

      <h1 className="text-content mt-4 text-2xl font-bold sm:text-3xl">{category.name}</h1>

      {siblings.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {siblings.map((child) => {
            const isActive = child.slug === category.slug;
            return (
              <li key={child.slug}>
                <Link
                  href={`/categories/${child.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-border bg-surface text-content-muted hover:border-gold-400 hover:text-gold-700'
                  }`}
                >
                  {child.name}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ——— Filtres et tri ——— */}
      <div className="border-border mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y py-3">
        <div className="flex flex-wrap items-center gap-2">
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
                    ? 'bg-gold-50 text-gold-700 font-semibold'
                    : 'text-content-muted hover:text-gold-700'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ dispo: inStockOnly ? undefined : '1' })}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              inStockOnly
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-border text-content-muted hover:text-gold-700'
            }`}
          >
            En stock
          </Link>
          <Link
            href={buildHref({ promo: onSaleOnly ? undefined : '1' })}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              onSaleOnly
                ? 'border-sale-500 bg-sale-500 text-white'
                : 'border-border text-content-muted hover:text-gold-700'
            }`}
          >
            En promotion
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ProductGrid
          products={page.items}
          emptyMessage={
            inStockOnly || onSaleOnly
              ? 'Aucun produit ne correspond à ces filtres. Essayez de les retirer.'
              : 'Cette catégorie ne contient pas encore de produit.'
          }
        />
      </div>

      {page.nextCursor ? (
        <div className="mt-8 text-center">
          <Link
            href={buildHref({ apres: page.nextCursor })}
            className="border-border text-content hover:border-gold-400 hover:text-gold-700 rounded-control inline-block border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Voir plus de produits
          </Link>
        </div>
      ) : null}
    </main>
  );
}
