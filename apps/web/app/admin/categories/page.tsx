import type { Metadata } from 'next';

import { listerCategories } from '@beralshopp/core';

import { CategoryManager } from '@/components/admin/category-manager';

export const metadata: Metadata = {
  title: 'Catégories',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CategoriesAdminPage() {
  const categories = await listerCategories();
  const rubriques = categories.filter((c) => c.parentId === null).length;

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Catégories</h1>
      <p className="text-content-muted mt-1 text-sm">
        {rubriques} rubrique{rubriques > 1 ? 's' : ''} et {categories.length - rubriques}{' '}
        sous-catégorie{categories.length - rubriques > 1 ? 's' : ''}
      </p>

      <div className="mt-5">
        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
