import type { Metadata } from 'next';
import Link from 'next/link';
import { PackagePlus, Search } from 'lucide-react';

import { listAdminProducts } from '@beralshopp/core';
import { formatMoney } from '@beralshopp/shared';

export const metadata: Metadata = {
  title: 'Produits',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'En vente', className: 'bg-success-500/10 text-success-500' },
  DRAFT: { label: 'Brouillon', className: 'bg-gold-100 text-gold-800' },
  ARCHIVED: { label: 'Archivé', className: 'bg-ink-100 text-ink-600' },
};

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'ACTIVE', label: 'En vente' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ARCHIVED', label: 'Archivés' },
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = single(params['q']);
  const status = single(params['statut']);

  const products = await listAdminProducts({
    ...(query ? { query } : {}),
    ...(status ? { status } : {}),
    limit: 100,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-content text-xl font-bold sm:text-2xl">Produits</h1>
        <Link
          href="/admin/produits/nouveau"
          className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
        >
          <PackagePlus className="h-4 w-4" aria-hidden />
          Nouveau produit
        </Link>
      </div>
      <p className="text-content-muted mt-1 text-sm">
        {products.length} produit{products.length > 1 ? 's' : ''} affiché
        {products.length > 1 ? 's' : ''}
      </p>

      <form method="get" className="mt-4 flex max-w-md gap-2">
        {status ? <input type="hidden" name="statut" value={status} /> : null}
        <div className="relative flex-1">
          <Search
            className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={query}
            placeholder="Nom, référence ou identifiant…"
            aria-label="Rechercher un produit"
            className="border-border bg-surface text-content rounded-control h-10 w-full border ps-9 pe-3 text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="border-border text-content hover:border-gold-400 rounded-control border px-4 text-sm font-medium transition-colors"
        >
          Chercher
        </button>
      </form>

      <ul className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter.value === status;
          const search = new URLSearchParams();
          if (query) search.set('q', query);
          if (filter.value) search.set('statut', filter.value);
          return (
            <li key={filter.value || 'all'}>
              <Link
                href={`/admin/produits${search.toString() ? `?${search}` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                className={`block rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-border bg-surface text-content-muted hover:border-gold-400'
                }`}
              >
                {filter.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {products.length === 0 ? (
        <div className="border-border bg-surface rounded-card mt-6 border border-dashed px-6 py-12 text-center">
          <p className="text-content-muted text-sm">Aucun produit ne correspond.</p>
        </div>
      ) : (
        <div className="border-border bg-surface rounded-card mt-6 overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-surface-muted text-content-muted text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Produit</th>
                  <th className="px-4 py-2.5 text-start font-medium">Statut</th>
                  <th className="px-4 py-2.5 text-end font-medium">Prix</th>
                  <th className="px-4 py-2.5 text-end font-medium">Stock</th>
                  <th className="px-4 py-2.5 text-end font-medium">Vendus</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {products.map((product) => {
                  const meta = STATUS_META[product.status] ?? {
                    label: product.status,
                    className: 'bg-ink-100 text-ink-600',
                  };
                  return (
                    <tr key={product.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/produits/${product.id}`}
                          className="text-content hover:text-gold-700 font-medium"
                        >
                          {product.name}
                        </Link>
                        <span className="text-content-muted beral-price block text-xs">
                          {product.sku}
                          {product.categoryName ? ` · ${product.categoryName}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[0.7rem] font-semibold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className="beral-price text-content font-semibold">
                          {formatMoney(product.price, 'fr')}
                        </span>
                        {product.compareAt ? (
                          <span className="text-content-muted beral-price block text-xs line-through">
                            {formatMoney(product.compareAt, 'fr')}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {/* On affiche le stock VENDABLE, pas le physique : c'est celui
                            qui détermine ce qu'un client peut réellement acheter. */}
                        <span
                          className={`beral-price font-semibold ${
                            product.availableStock === 0
                              ? 'text-danger-500'
                              : product.availableStock <= 5
                                ? 'text-warning-500'
                                : 'text-content'
                          }`}
                        >
                          {product.availableStock}
                        </span>
                        <span className="text-content-muted block text-xs">
                          {product.variantCount} variante{product.variantCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="beral-price text-content-muted px-4 py-3 text-end">
                        {product.salesCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
