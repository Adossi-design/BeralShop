import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { getOrderByNumber, nextStatusesFor } from '@beralshopp/core';
import { prisma } from '@beralshopp/db';
import { formatMoney } from '@beralshopp/shared';

import { ChangeStatusForm, TrackingForm } from '@/components/admin/order-actions';
import { OrderStatusBadge } from '@/components/admin/order-status-badge';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { setInternalNoteAction } from '@/lib/admin-actions';
import { ConsoleCorps, ConsoleEnTete } from '@/components/admin/console';

export const metadata: Metadata = {
  title: 'Détail de la commande',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface PageProps {
  params: Promise<{ numero: string }>;
}

export default async function AdminOrderPage({ params }: PageProps) {
  const { numero } = await params;
  const orderNumber = decodeURIComponent(numero);

  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  // La note interne n'est jamais exposée au client : elle ne fait pas partie de
  // `OrderView`, on la lit séparément.
  const internal = await prisma.order.findUnique({
    where: { orderNumber },
    select: { internalNote: true },
  });

  const allowed = nextStatusesFor(order.status);

  return (
    <>
      <ConsoleEnTete>
        <Link
          href="/admin/commandes"
          className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          Toutes les commandes
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-content beral-price text-xl font-bold sm:text-2xl">
            {order.orderNumber}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-content-muted mt-1 text-sm">
          Passée le {dateFormat.format(order.placedAt)}
        </p>
      </ConsoleEnTete>

      <ConsoleCorps>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {/* ——— Articles ——— */}
            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-3 font-semibold">Articles</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead className="text-content-muted text-xs">
                    <tr>
                      <th className="pb-2 text-start font-medium">Produit</th>
                      <th className="pb-2 text-end font-medium">P.U.</th>
                      <th className="pb-2 text-end font-medium">Qté</th>
                      <th className="pb-2 text-end font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {order.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-2.5">
                          <span className="text-content block">{line.productName}</span>
                          <span className="text-content-muted beral-price block text-xs">
                            {line.sku}
                            {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                          </span>
                        </td>
                        <td className="beral-price text-content-muted py-2.5 text-end">
                          {formatMoney(line.unitPrice, 'fr')}
                        </td>
                        <td className="beral-price text-content py-2.5 text-end">
                          {line.quantity}
                        </td>
                        <td className="beral-price text-content py-2.5 text-end font-semibold">
                          {formatMoney(line.lineTotal, 'fr')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="border-border mt-4 space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-content-muted">Sous-total</dt>
                  <dd className="beral-price">{formatMoney(order.subtotal, 'fr')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-content-muted">Livraison</dt>
                  <dd className="beral-price">{formatMoney(order.shipping, 'fr')}</dd>
                </div>
                <div className="flex justify-between font-bold">
                  <dt className="text-content">Total</dt>
                  <dd className="beral-price text-content">{formatMoney(order.total, 'fr')}</dd>
                </div>
              </dl>
            </section>

            {/* ——— Livraison ——— */}
            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-3 font-semibold">Livraison</h2>
              <p className="text-content text-sm font-medium">
                {order.shippingAddress.recipientName}
              </p>
              <p className="text-content-muted beral-price text-sm">
                {order.shippingAddress.phone}
              </p>
              <p className="text-content-muted mt-1 text-sm">
                {[
                  order.shippingAddress.village,
                  order.shippingAddress.cell,
                  order.shippingAddress.sector,
                  order.shippingAddress.district,
                  order.shippingAddress.province,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {order.shippingAddress.landmark ? (
                <p className="text-content-muted mt-1 text-xs">
                  Repère : {order.shippingAddress.landmark}
                </p>
              ) : null}
              {order.customerNote ? (
                <p className="border-border text-content-muted mt-3 border-t pt-3 text-sm">
                  <span className="text-content font-medium">Note du client :</span>{' '}
                  {order.customerNote}
                </p>
              ) : null}

              <div className="border-border mt-4 border-t pt-4">
                <TrackingForm
                  orderNumber={order.orderNumber}
                  trackingNumber={order.trackingNumber}
                  carrierName={order.carrierName}
                />
              </div>
            </section>

            {/* ——— Note interne ——— */}
            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-1 font-semibold">Note interne</h2>
              <p className="text-content-muted mb-3 text-xs">
                Visible uniquement par l&apos;équipe. Jamais affichée au client.
              </p>
              <form action={setInternalNoteAction} className="space-y-3">
                <input type="hidden" name="orderNumber" value={order.orderNumber} />
                <textarea
                  name="internalNote"
                  rows={3}
                  defaultValue={internal?.internalNote ?? ''}
                  className="border-border bg-surface text-content rounded-control w-full border px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="border-border text-content hover:border-gold-400 rounded-control border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Enregistrer la note
                </button>
              </form>
            </section>
          </div>

          {/* ——— Actions ——— */}
          <aside className="space-y-4">
            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-3 font-semibold">Changer le statut</h2>
              <ChangeStatusForm orderNumber={order.orderNumber} allowed={allowed} />
            </section>

            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-4 font-semibold">Suivi</h2>
              <OrderTimeline order={order} />
            </section>

            <section className="border-border bg-surface rounded-card border p-5">
              <h2 className="text-content mb-3 font-semibold">Historique</h2>
              <ul className="space-y-2 text-xs">
                {order.events.map((event, index) => (
                  <li key={`${event.toStatus}-${index}`} className="flex justify-between gap-2">
                    <span className="text-content">
                      <OrderStatusBadge status={event.toStatus} />
                    </span>
                    <span className="text-content-muted shrink-0 text-end">
                      {dateFormat.format(event.createdAt)}
                      <span className="block">{event.actorType}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </ConsoleCorps>
    </>
  );
}
