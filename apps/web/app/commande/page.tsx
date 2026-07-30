import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { getCart } from '@beralshopp/core';
import { formatMoney } from '@beralshopp/shared';

import { CheckoutForm } from '@/components/orders/checkout-form';
import { getCartOwnerForRead } from '@/lib/cart';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Commande',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const owner = await getCartOwnerForRead();
  const cart = owner ? await getCart(owner) : null;

  // Un panier vide n'a rien à commander : on renvoie au panier plutôt que
  // d'afficher un formulaire qui échouera de toute façon.
  if (!cart || cart.lines.length === 0) redirect('/panier');

  const user = await getCurrentUser();
  const blockingLines = cart.lines.filter(
    (line) => line.issue === 'UNAVAILABLE' || line.issue === 'OUT_OF_STOCK',
  );

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <h1 className="text-content text-xl font-bold sm:text-2xl">Finaliser ma commande</h1>

      {!user ? (
        <p className="border-border bg-surface-muted rounded-control mt-4 text-sm">
          <span className="block px-4 py-3">
            Vous commandez sans compte.{' '}
            <Link href="/connexion?suite=/commande" className="text-gold-700 font-medium underline">
              Se connecter
            </Link>{' '}
            permet de suivre vos commandes et de ne plus ressaisir votre adresse.
          </span>
        </p>
      ) : null}

      {blockingLines.length > 0 ? (
        <p
          role="alert"
          className="border-danger-500/40 bg-danger-500/5 text-danger-500 rounded-control mt-4 flex items-start gap-2 border px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {blockingLines.length} article
            {blockingLines.length > 1
              ? 's ne sont plus disponibles'
              : " n'est plus disponible"}.{' '}
            <Link href="/panier" className="font-semibold underline">
              Ajuster mon panier
            </Link>
          </span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="border-border bg-surface rounded-card border p-5 sm:p-6">
          <CheckoutForm
            isLoggedIn={Boolean(user)}
            {...(user?.phone ? { defaultPhone: user.phone } : {})}
            {...(user?.fullName ? { defaultName: user.fullName } : {})}
            {...(user?.email ? { defaultEmail: user.email } : {})}
          />
        </div>

        {/* ——— Récapitulatif ——— */}
        <aside className="border-border bg-surface rounded-card h-fit border p-5 lg:sticky lg:top-40">
          <h2 className="text-content font-semibold">Votre commande</h2>

          <ul className="mt-4 space-y-3">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="text-content block truncate">{line.productName}</span>
                  <span className="text-content-muted text-xs">
                    {line.variantLabel ? `${line.variantLabel} · ` : ''}×{line.quantity}
                  </span>
                </span>
                <span className="beral-price text-content shrink-0 font-medium">
                  {formatMoney(line.lineTotal, 'fr')}
                </span>
              </li>
            ))}
          </ul>

          <dl className="border-border mt-4 space-y-2.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-muted">Sous-total</dt>
              <dd className="beral-price text-content">{formatMoney(cart.subtotal, 'fr')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-muted">Livraison</dt>
              <dd className="beral-price text-content">
                {cart.isShippingFree ? (
                  <span className="text-success-500">Offerte</span>
                ) : cart.shippingEstimate ? (
                  formatMoney(cart.shippingEstimate, 'fr')
                ) : (
                  'À calculer'
                )}
              </dd>
            </div>
            <div className="border-border flex justify-between border-t pt-3">
              <dt className="text-content font-semibold">Total</dt>
              <dd className="beral-price text-content text-lg font-bold">
                {formatMoney(cart.total, 'fr')}
              </dd>
            </div>
          </dl>

          <p className="text-content-muted mt-4 text-xs">
            Les frais définitifs dépendent de la province indiquée et peuvent différer de cette
            estimation.
          </p>

          <Link
            href="/panier"
            className="text-content-muted hover:text-gold-700 mt-4 block text-center text-sm"
          >
            Modifier mon panier
          </Link>
        </aside>
      </div>
    </main>
  );
}
