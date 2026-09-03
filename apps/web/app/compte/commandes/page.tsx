import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, PackageOpen } from 'lucide-react';

import { ETAPES_CLIENT, type EtapeClient, listUserOrders } from '@beralshopp/core';
import { FUSEAU_BOUTIQUE, formatMoney } from '@beralshopp/shared';

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

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeZone: FUSEAU_BOUTIQUE,
});

/**
 * Onglets d'étape, dans l'ordre du parcours d'une commande.
 *
 * Les mêmes quatre que sur la page du compte, et tirés de la MÊME définition :
 * un client qui voit « 2 en préparation » sur son accueil doit retrouver
 * exactement deux commandes en cliquant.
 */
const ETAPES: readonly { readonly cle: EtapeClient | ''; readonly libelle: string }[] = [
  { cle: '', libelle: 'Toutes' },
  { cle: 'paiement', libelle: 'À payer' },
  { cle: 'preparation', libelle: 'En préparation' },
  { cle: 'livraison', libelle: 'En livraison' },
  { cle: 'livrees', libelle: 'Livrées' },
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const requete = await searchParams;
  const demandee = typeof requete['etape'] === 'string' ? requete['etape'] : '';
  const etape = (demandee in ETAPES_CLIENT ? demandee : '') as EtapeClient | '';

  const orders = await listUserOrders(user.id, 20, etape ? ETAPES_CLIENT[etape] : undefined);

  const onglets = (
    <ul className="mt-4 flex flex-wrap gap-2">
      {ETAPES.map((o) => {
        const actif = o.cle === etape;
        return (
          <li key={o.cle || 'toutes'}>
            <Link
              href={o.cle ? `/compte/commandes?etape=${o.cle}` : '/compte/commandes'}
              aria-current={actif ? 'page' : undefined}
              className={`block rounded-full border px-3 py-1.5 text-xs transition-colors ${
                actif
                  ? 'border-gold-400 bg-gold-400 text-ink-950 font-semibold'
                  : 'border-border bg-surface text-content-muted hover:border-gold-400'
              }`}
            >
              {o.libelle}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (orders.length === 0) {
    return (
      <>
        <h1 className="text-content text-xl font-bold sm:text-2xl">Mes commandes</h1>
        {onglets}
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
      {onglets}
      <p className="text-content-muted mt-3 text-sm">
        {orders.length} commande{orders.length > 1 ? 's' : ''}
      </p>

      <ul className="mt-3 space-y-3">
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
                            variantId: null,
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
