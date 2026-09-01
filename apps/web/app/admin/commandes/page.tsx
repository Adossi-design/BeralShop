import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';

import { listAdminOrders } from '@beralshopp/core';
import type { OrderStatus } from '@beralshopp/db';
import { formatMoney } from '@beralshopp/shared';

import { ORDER_STATUS_META, OrderStatusBadge } from '@/components/admin/order-status-badge';
import { ConsoleEnTete, ConsoleTableau } from '@/components/admin/console';

export const metadata: Metadata = {
  title: 'Commandes',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Filtres du quotidien : ceux qui correspondent à une file de travail réelle. */
const FILTERS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING_PAYMENT', label: 'Attente paiement' },
  { value: 'PAID', label: 'À préparer' },
  { value: 'PROCESSING', label: 'En préparation' },
  { value: 'SHIPPED', label: 'Expédiées' },
  { value: 'DELIVERED', label: 'Livrées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statut = single(params['statut']);
  const query = single(params['q']);
  const cursor = single(params['apres']);

  const isKnownStatus = statut in ORDER_STATUS_META;

  const { rows, nextCursor } = await listAdminOrders({
    ...(isKnownStatus ? { status: statut as OrderStatus } : {}),
    ...(query ? { query } : {}),
    ...(cursor ? { cursor } : {}),
    limit: 30,
  });

  function href(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    if (statut) next.set('statut', statut);
    if (query) next.set('q', query);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return `/admin/commandes${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <ConsoleEnTete>
        <h1 className="text-content text-xl font-bold sm:text-2xl">Commandes</h1>

        {/* ——— Recherche ——— */}
        <form method="get" className="mt-4 flex max-w-md gap-2">
          {statut ? <input type="hidden" name="statut" value={statut} /> : null}
          <div className="relative flex-1">
            <Search
              className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={query}
              placeholder="Numéro de commande ou téléphone…"
              aria-label="Rechercher une commande"
              className="border-border bg-surface text-content rounded-control h-10 w-full border ps-9 pe-3 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="border-border text-content hover:border-gold-400 rounded-control border px-4 text-sm font-medium transition-colors"
          >
            Chercher
          </button>
        </form>

        {/* ——— Files de travail ——— */}
        <ul className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isActive = filter.value === statut;
            return (
              <li key={filter.value || 'all'}>
                <Link
                  href={href({ statut: filter.value || undefined, apres: undefined })}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : 'border-border bg-surface text-content-muted hover:border-gold-400'
                  }`}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </ConsoleEnTete>

      {rows.length === 0 ? (
        <div className="border-border bg-surface rounded-card mt-6 border border-dashed px-6 py-12 text-center">
          <p className="text-content-muted text-sm">
            {query || statut
              ? 'Aucune commande ne correspond à ces critères.'
              : 'Aucune commande pour le moment.'}
          </p>
        </div>
      ) : (
        <ConsoleTableau>
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-surface-muted text-content-muted sticky top-0 z-10 text-xs">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">Commande</th>
                <th className="px-4 py-2.5 text-start font-medium">Client</th>
                <th className="px-4 py-2.5 text-start font-medium">Statut</th>
                <th className="px-4 py-2.5 text-end font-medium">Total</th>
                <th className="px-4 py-2.5 text-start font-medium">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((order) => (
                <tr key={order.orderNumber} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commandes/${order.orderNumber}`}
                      className="beral-price text-content hover:text-gold-700 font-semibold"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-content-muted block text-xs">
                      {order.itemCount} article{order.itemCount > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-content block">{order.customerName}</span>
                    <span className="text-content-muted beral-price block text-xs">
                      {order.contactPhone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                    {order.trackingNumber ? (
                      <span className="text-content-muted beral-price mt-1 block text-xs">
                        {order.trackingNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="beral-price text-content px-4 py-3 text-end font-semibold">
                    {formatMoney(order.total, 'fr')}
                  </td>
                  <td className="text-content-muted px-4 py-3 text-xs">
                    {dateFormat.format(order.placedAt)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/admin/commandes/${order.orderNumber}`}
                      aria-label={`Ouvrir ${order.orderNumber}`}
                      className="text-content-muted hover:text-gold-700 inline-block"
                    >
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* La pagination vit DANS la zone défilante, à la suite des lignes.
                Posée en dehors, elle resterait collée au bas de l'écran et
                s'offrirait au clic avant même qu'on ait vu la première ligne. */}
          {nextCursor ? (
            <div className="border-border border-t p-4 text-center">
              <Link
                href={href({ apres: nextCursor })}
                className="border-border text-content hover:border-gold-400 rounded-control inline-block border px-6 py-2.5 text-sm font-medium transition-colors"
              >
                Charger la suite
              </Link>
            </div>
          ) : null}
        </ConsoleTableau>
      )}
    </>
  );
}
