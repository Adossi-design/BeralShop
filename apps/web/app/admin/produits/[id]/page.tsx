import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';

import { prisma } from '@beralshopp/db';

import { ProductPricingForm, StockForm } from '@/components/admin/product-forms';

export const metadata: Metadata = {
  title: 'Modifier le produit',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function variantLabel(options: unknown): string {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) return '';
  return Object.entries(options as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => `${key} : ${String(value)}`)
    .join(' · ');
}

export default async function AdminProductPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      sku: true,
      slug: true,
      status: true,
      basePriceMinor: true,
      compareAtPriceMinor: true,
      salesCount: true,
      publishedAt: true,
      translations: { where: { locale: 'fr' }, select: { name: true, description: true } },
      category: {
        select: { translations: { where: { locale: 'fr' }, select: { name: true } } },
      },
      brand: { select: { name: true } },
      variants: {
        orderBy: { priceDeltaMinor: 'asc' },
        select: {
          id: true,
          sku: true,
          options: true,
          stockQuantity: true,
          reservedQuantity: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) notFound();

  const name = product.translations[0]?.name ?? product.sku;

  return (
    <>
      <Link
        href="/admin/produits"
        className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        Tous les produits
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-content text-xl font-bold sm:text-2xl">{name}</h1>
          <p className="text-content-muted beral-price mt-1 text-sm">
            {product.sku}
            {product.brand ? ` · ${product.brand.name}` : ''}
            {product.category?.translations[0] ? ` · ${product.category.translations[0].name}` : ''}
          </p>
        </div>

        {product.status === 'ACTIVE' ? (
          <Link
            href={`/produits/${product.slug}`}
            target="_blank"
            className="border-border text-content hover:border-gold-400 rounded-control inline-flex items-center gap-1.5 border px-4 py-2 text-sm transition-colors"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Voir sur la boutique
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content mb-4 font-semibold">Prix et publication</h2>
          <ProductPricingForm
            productId={product.id}
            basePriceMinor={product.basePriceMinor}
            compareAtPriceMinor={product.compareAtPriceMinor}
            status={product.status}
          />
        </section>

        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content font-semibold">Stock par variante</h2>
          <p className="text-content-muted mt-1 mb-2 text-xs">
            Le stock ne peut pas descendre sous la quantité réservée par des commandes en attente de
            paiement.
          </p>

          <div>
            {product.variants
              .filter((variant) => variant.isActive)
              .map((variant) => (
                <StockForm
                  key={variant.id}
                  variantId={variant.id}
                  sku={variant.sku}
                  label={variantLabel(variant.options)}
                  stockQuantity={variant.stockQuantity}
                  reservedQuantity={variant.reservedQuantity}
                />
              ))}
          </div>
        </section>
      </div>

      <section className="border-border bg-surface rounded-card mt-4 border p-5">
        <h2 className="text-content mb-2 font-semibold">Description</h2>
        <p className="text-content-muted text-sm whitespace-pre-line">
          {product.translations[0]?.description ?? 'Aucune description.'}
        </p>
        <p className="text-content-muted mt-4 text-xs">
          L&apos;édition du nom, de la description, des photos et des variantes arrive avec
          l&apos;éditeur complet. Le prix, le stock et la publication — les réglages du quotidien —
          sont modifiables dès maintenant.
        </p>
      </section>
    </>
  );
}
