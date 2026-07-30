import type { Metadata } from 'next';

import { ProductListing } from '@/components/catalog/product-listing';

export const metadata: Metadata = {
  title: 'Meilleures ventes',
  description:
    'Les produits les plus vendus sur Beralshopp, choisis par nos clients. ' +
    'Paiement Mobile Money ou carte, livraison au Rwanda.',
  alternates: { canonical: '/meilleures-ventes' },
};

export const revalidate = 300;

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ProductListing
      basePath="/meilleures-ventes"
      title="Meilleures ventes"
      description="Les produits les plus achetés par nos clients."
      emptyMessage="Le classement apparaîtra dès les premières ventes."
      defaultSort="best_selling"
      // Seuls les produits réellement disponibles : mettre en avant une rupture
      // est le meilleur moyen de décevoir un client déjà convaincu.
      filters={{ inStockOnly: true }}
      searchParams={await searchParams}
    />
  );
}
