import type { Metadata } from 'next';
import Link from 'next/link';

import { listCategoryTree } from '@beralshopp/core';

import { Breadcrumb } from '@/components/catalog/breadcrumb';

export const metadata: Metadata = {
  title: 'Toutes les catégories',
  description:
    'Parcourez toutes les catégories Beralshopp : électronique, mode, maison, beauté, ' +
    'supermarché, informatique, sport et bien plus.',
};

/**
 * Page « toutes les catégories ».
 *
 * Régénérée toutes les heures plutôt qu'à chaque visite : la taxonomie bouge très
 * rarement, il serait absurde d'interroger la base pour chaque visiteur. C'est
 * exactement le rôle de l'ISR décrit dans le dossier technique.
 */
export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await listCategoryTree();

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <Breadcrumb items={[{ href: '/categories', label: 'Catégories' }]} />

      <h1 className="text-content mt-4 text-2xl font-bold sm:text-3xl">Toutes les catégories</h1>
      <p className="text-content-muted mt-1 text-sm">
        {categories.length} rubriques pour trouver rapidement ce que vous cherchez.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <section
            key={category.slug}
            className="border-border bg-surface rounded-card shadow-card border p-5"
          >
            <h2 className="text-content text-base font-semibold">
              <Link href={`/categories/${category.slug}`} className="hover:text-gold-700">
                {category.name}
              </Link>
              {category.productCount ? (
                <span className="text-content-muted ms-2 text-xs font-normal">
                  {category.productCount}
                </span>
              ) : null}
            </h2>

            {category.children.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/categories/${child.slug}`}
                      className="text-content-muted hover:text-gold-700 text-sm"
                    >
                      {child.name}
                      {child.productCount ? (
                        <span className="text-content-muted/70 ms-1.5 text-xs">
                          ({child.productCount})
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-content-muted mt-3 text-sm">
                <Link href={`/categories/${category.slug}`} className="hover:text-gold-700">
                  Voir les produits →
                </Link>
              </p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
