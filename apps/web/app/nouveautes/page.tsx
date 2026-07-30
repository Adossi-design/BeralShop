import type { Metadata } from 'next';

import { ProductListing } from '@/components/catalog/product-listing';

export const metadata: Metadata = {
  title: 'Nouveaux arrivages',
  description:
    'Les derniers produits arrivés sur Beralshopp. Électronique, mode, maison, ' +
    'informatique et plus encore.',
  alternates: { canonical: '/nouveautes' },
};

export const revalidate = 300;

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ProductListing
      basePath="/nouveautes"
      title="Nouveaux arrivages"
      // 30 jours : c'est aussi la fenêtre du badge « Nouveau » sur les fiches
      // produits. Deux durées différentes créeraient une incohérence visible.
      description="Les produits ajoutés au catalogue ces 30 derniers jours."
      emptyMessage="Aucun nouveau produit ces 30 derniers jours."
      defaultSort="newest"
      filters={{ newWithinDays: 30 }}
      searchParams={await searchParams}
    />
  );
}
