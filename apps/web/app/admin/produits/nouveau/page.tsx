import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { listCategoryTree } from '@beralshopp/core';

import { NewProductForm } from '@/components/admin/new-product-form';

export const metadata: Metadata = {
  title: 'Nouveau produit',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NouveauProduitPage() {
  const arbre = await listCategoryTree();

  /**
   * Rubriques ET sous-catégories, aplaties : un produit se range presque
   * toujours dans une sous-catégorie (« Appareils photo »), pas dans la rubrique
   * (« Électronique »). N'offrir que les rubriques forcerait un classement grossier.
   */
  const categories = arbre.flatMap((rubrique) => [
    { id: rubrique.id, name: rubrique.name },
    ...rubrique.children.map((enfant) => ({
      id: enfant.id,
      name: `${rubrique.name} › ${enfant.name}`,
    })),
  ]);

  return (
    <>
      <Link
        href="/admin/produits"
        className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Tous les produits
      </Link>

      <h1 className="text-content mt-2 text-xl font-bold sm:text-2xl">Nouveau produit</h1>

      <section className="border-border bg-surface rounded-card mt-4 max-w-2xl border p-5">
        <NewProductForm categories={categories} />
      </section>
    </>
  );
}
