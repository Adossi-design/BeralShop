import Link from 'next/link';
import { MapPin, Package, Truck } from 'lucide-react';

import type { OrderView } from '@beralshopp/core';
import { FUSEAU_BOUTIQUE, formatMoney } from '@beralshopp/shared';

import { ProductImage } from '@/components/catalog/product-image';

import { OrderTimeline } from './order-timeline';

/**
 * Détail d'une commande.
 *
 * Composant unique, réutilisé par la page de confirmation, le suivi public et
 * l'espace client. Trois écrans dupliqués finiraient inévitablement par diverger,
 * et c'est sur celui qu'on oublie de mettre à jour que le client verra une erreur.
 */

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: FUSEAU_BOUTIQUE,
});

function formatAddress(order: OrderView): string {
  const a = order.shippingAddress;
  return [a.village, a.cell, a.sector, a.district, a.province, a.city, a.streetLine]
    .filter(Boolean)
    .join(', ');
}

export function OrderDetail({ order }: { readonly order: OrderView }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        {/* ——— Suivi ——— */}
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content mb-4 font-semibold">Suivi de la commande</h2>
          <OrderTimeline order={order} />

          {order.trackingNumber ? (
            <p className="border-border mt-4 flex items-start gap-2 border-t pt-4 text-sm">
              <Truck className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="text-content-muted">
                Numéro de suivi{' '}
                <span className="beral-price text-content font-medium">{order.trackingNumber}</span>
                {order.carrierName ? ` · ${order.carrierName}` : ''}
              </span>
            </p>
          ) : null}
        </section>

        {/* ——— Articles ——— */}
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content mb-4 font-semibold">
            <Package className="me-2 inline h-4 w-4" aria-hidden />
            {order.lines.length} article{order.lines.length > 1 ? 's' : ''}
          </h2>

          <ul className="divide-border divide-y">
            {order.lines.map((line) => (
              <li key={line.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="bg-surface-muted border-border relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                  <ProductImage
                    image={
                      line.imageUrl
                        ? {
                            url: line.imageUrl,
                            altText: line.productName,
                            width: null,
                            height: null,
                          }
                        : null
                    }
                    name={line.productName}
                    sizes="64px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-content text-sm font-medium">
                    {/* Le lien n'existe que si le produit est encore au catalogue :
                        la commande, elle, conserve sa copie quoi qu'il arrive. */}
                    {line.productSlug ? (
                      <Link href={`/produits/${line.productSlug}`} className="hover:text-gold-700">
                        {line.productName}
                      </Link>
                    ) : (
                      line.productName
                    )}
                  </p>
                  {line.variantLabel ? (
                    <p className="text-content-muted mt-0.5 text-xs">{line.variantLabel}</p>
                  ) : null}
                  <p className="text-content-muted beral-price mt-0.5 text-xs">
                    {formatMoney(line.unitPrice, 'fr')} × {line.quantity}
                  </p>
                </div>

                <p className="beral-price text-content shrink-0 text-sm font-bold">
                  {formatMoney(line.lineTotal, 'fr')}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ——— Livraison ——— */}
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content mb-3 font-semibold">
            <MapPin className="me-2 inline h-4 w-4" aria-hidden />
            Adresse de livraison
          </h2>
          <p className="text-content text-sm font-medium">{order.shippingAddress.recipientName}</p>
          <p className="text-content-muted beral-price text-sm">{order.shippingAddress.phone}</p>
          <p className="text-content-muted mt-1 text-sm">{formatAddress(order)}</p>
          {order.shippingAddress.landmark ? (
            <p className="text-content-muted mt-1 text-xs">
              Repère : {order.shippingAddress.landmark}
            </p>
          ) : null}

          {order.customerNote ? (
            <p className="border-border text-content-muted mt-3 border-t pt-3 text-sm">
              <span className="text-content font-medium">Note :</span> {order.customerNote}
            </p>
          ) : null}
        </section>
      </div>

      {/* ——— Récapitulatif ——— */}
      <aside className="border-border bg-surface rounded-card h-fit border p-5">
        <h2 className="text-content font-semibold">Récapitulatif</h2>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-content-muted">Numéro</dt>
            <dd className="beral-price text-content font-medium">{order.orderNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-content-muted">Passée le</dt>
            <dd className="text-content">{dateFormat.format(order.placedAt)}</dd>
          </div>

          <div className="border-border flex justify-between border-t pt-3">
            <dt className="text-content-muted">Sous-total</dt>
            <dd className="beral-price text-content">{formatMoney(order.subtotal, 'fr')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-content-muted">Livraison</dt>
            <dd className="beral-price text-content">
              {order.shipping.amountMinor === 0 ? (
                <span className="text-success-500">Offerte</span>
              ) : (
                formatMoney(order.shipping, 'fr')
              )}
            </dd>
          </div>
          {order.discount.amountMinor > 0 ? (
            <div className="flex justify-between">
              <dt className="text-content-muted">Remise</dt>
              <dd className="beral-price text-success-500">−{formatMoney(order.discount, 'fr')}</dd>
            </div>
          ) : null}

          <div className="border-border flex justify-between border-t pt-3">
            <dt className="text-content font-semibold">Total</dt>
            <dd className="beral-price text-content text-lg font-bold">
              {formatMoney(order.total, 'fr')}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
