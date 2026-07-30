import type { Metadata } from 'next';

import { ProductListing } from '@/components/catalog/product-listing';

export const metadata: Metadata = {
  title: 'Promotions',
  description:
    'Tous les produits en promotion sur Beralshopp. Prix réduits sur l’électronique, ' +
    'la mode, la maison et bien plus. Livraison au Rwanda.',
  alternates: { canonical: '/promotions' },
};

export const revalidate = 300;

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ProductListing
      basePath="/promotions"
      title="Promotions"
      description="Les produits dont le prix est actuellement réduit."
      emptyMessage="Aucune promotion en cours pour le moment. Revenez bientôt."
      defaultSort="best_selling"
      filters={{ onSaleOnly: true }}
      searchParams={await searchParams}
    />
  );
}
