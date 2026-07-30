import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, PackageOpen } from 'lucide-react';

import { listUserOrders } from '@beralshopp/core';
import { formatMoney } from '@beralshopp/shared';

import { ProductImage } from '@/components/catalog/product-image';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mes commandes',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'En attente de paiement', className: 'bg-gold-100 text-gold-800' },
  PAYMENT_FAILED: { label: 'Paiement échoué', className: 'bg-danger-500/10 text-danger-500' },
  EXPIRED: { label: 'Expirée', className: 'bg-ink-100 text-ink-600' },
  CANCELLED: { label: 'Annulée', className: 'bg-ink-100 text-ink-600' },
  PAID: { label: 'Payée', className: 'bg-success-500/10 text-success-500' },
  PROCESSING: { label: 'En préparation', className: 'bg-info-500/10 text-info-500' },
  SHIPPED: { label: 'Expédiée', className: 'bg-info-500/10 text-info-500' },
  OUT_FOR_DELIVERY: { label: 'En livraison', className: 'bg-info-500/10 text-info-500' },
  DELIVERED: { label: 'Livrée', className: 'bg-success-500/10 text-success-500' },
  REFUNDED: { label: 'Remboursée', className: 'bg-ink-100 text-ink-600' },
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const orders = await listUserOrders(user.id);

  if (orders.length === 0) {
    return (
      <>
        <h1 className="text-content text-xl font-bold sm:text-2xl">Mes commandes</h1>
        <div className="border-border bg-surface-muted/50 rounded-card mt-6 border border-dashed px-6 py-14 text-center">
          <PackageOpen className="text-content-muted mx-auto h-8 w-8" aria-hidden />
          <p className="text-content mt-3 font-medium">Aucune commande pour le moment</p>
          <p className="text-content-muted mt-1 text-sm">
            Vos commandes apparaîtront ici, avec leur suivi étape par étape.
          </p>
          <Link
            href="/categories"
            className="beral-btn-gold rounded-control mt-5 inline-block px-6 py-2.5 text-sm font-semibold"
          >
            Découvrir les produits
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Mes commandes</h1>
      <p className="text-content-muted mt-1 text-sm">
        {orders.length} commande{orders.length > 1 ? 's' : ''}
      </p>

      <ul className="mt-6 space-y-3">
        {orders.map((order) => {
          const status = STATUS_LABELS[order.status] ?? {
            label: order.status,
            className: 'bg-ink-100 text-ink-600',
          };

          return (
            <li key={order.orderNumber}>
              <Link
                href={`/compte/commandes/${order.orderNumber}`}
                className="border-border bg-surface rounded-card hover:shadow-card flex items-center gap-4 border p-4 transition-shadow"
              >
                <div className="bg-surface-muted border-border relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                  <ProductImage
                    image={
                      order.firstImageUrl
                        ? {
                            url: order.firstImageUrl,
                            altText: '',
                            width: null,
                            height: null,
                          }
                        : null
                    }
                    name={order.orderNumber}
                    sizes="56px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="beral-price text-content text-sm font-semibold">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-content-muted mt-1 text-xs">
                    {dateFormat.format(order.placedAt)} · {order.itemCount} article
                    {order.itemCount > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="shrink-0 text-end">
                  <p className="beral-price text-content font-bold">
                    {formatMoney(order.total, 'fr')}
                  </p>
                </div>

                <ChevronRight
                  className="text-content-muted h-4 w-4 shrink-0 rtl:rotate-180"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
