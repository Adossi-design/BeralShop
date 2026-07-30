import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';

import { type CartLineView, type CartView, getCart } from '@beralshopp/core';
import { formatMoney } from '@beralshopp/shared';

import { ProductImage } from '@/components/catalog/product-image';
import { clearCartAction, removeCartItemAction, updateCartItemAction } from '@/lib/cart-actions';
import { getCartOwnerForRead } from '@/lib/cart';

export const metadata: Metadata = {
  title: 'Mon panier',
  robots: { index: false, follow: false },
};

/** Le panier dépend du cookie : jamais mis en cache. */
export const dynamic = 'force-dynamic';

const ISSUE_LABELS: Record<NonNullable<CartLineView['issue']>, string> = {
  UNAVAILABLE: "Ce produit n'est plus disponible et ne sera pas facturé.",
  OUT_OF_STOCK: 'Rupture de stock. Cet article ne sera pas facturé.',
  REDUCED_STOCK: 'Stock insuffisant : la quantité a été ajustée.',
  PRICE_CHANGED: 'Le prix de cet article a changé depuis son ajout.',
};

function QuantityStepper({ line }: { readonly line: CartLineView }) {
  const canDecrease = line.quantity > 1;
  const canIncrease = line.quantity < line.availableQuantity;

  return (
    <div className="border-border rounded-control inline-flex items-center border">
      {/* Chaque bouton est son propre formulaire : cela fonctionne sans JavaScript,
          ce qui compte sur les connexions où le script met du temps à charger. */}
      <form action={updateCartItemAction}>
        <input type="hidden" name="cartItemId" value={line.id} />
        <input type="hidden" name="quantity" value={line.quantity - 1} />
        <button
          type="submit"
          disabled={!canDecrease}
          aria-label={`Diminuer la quantité de ${line.productName}`}
          className="hover:bg-surface-muted px-2.5 py-1.5 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <span className="beral-price w-9 text-center text-sm font-semibold">{line.quantity}</span>

      <form action={updateCartItemAction}>
        <input type="hidden" name="cartItemId" value={line.id} />
        <input type="hidden" name="quantity" value={line.quantity + 1} />
        <button
          type="submit"
          disabled={!canIncrease}
          aria-label={`Augmenter la quantité de ${line.productName}`}
          className="hover:bg-surface-muted px-2.5 py-1.5 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

function Line({ line }: { readonly line: CartLineView }) {
  const isDead = line.issue === 'UNAVAILABLE' || line.issue === 'OUT_OF_STOCK';

  return (
    <li className="border-border flex gap-3 border-b py-4 last:border-b-0 sm:gap-4">
      <Link
        href={`/produits/${line.productSlug}`}
        className="bg-surface-muted border-border relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-24 sm:w-24"
      >
        <ProductImage
          image={
            line.imageUrl
              ? { url: line.imageUrl, altText: line.productName, width: null, height: null }
              : null
          }
          name={line.productName}
          sizes="96px"
          className={isDead ? 'opacity-50' : ''}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-content text-sm leading-snug font-medium">
              <Link href={`/produits/${line.productSlug}`} className="hover:text-gold-700">
                {line.productName}
              </Link>
            </h2>
            {line.variantLabel ? (
              <p className="text-content-muted mt-0.5 text-xs">{line.variantLabel}</p>
            ) : null}
            <p className="text-content-muted beral-price mt-0.5 text-xs">Réf. {line.sku}</p>
          </div>

          <form action={removeCartItemAction}>
            <input type="hidden" name="cartItemId" value={line.id} />
            <button
              type="submit"
              aria-label={`Retirer ${line.productName} du panier`}
              className="text-content-muted hover:text-danger-500 rounded p-1.5 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>

        {line.issue ? (
          <p className="text-warning-500 mt-2 flex items-start gap-1.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {ISSUE_LABELS[line.issue]}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {isDead ? (
            <span className="text-content-muted text-sm">Indisponible</span>
          ) : (
            <QuantityStepper line={line} />
          )}

          <div className="text-end">
            <p className="beral-price text-content font-bold">
              {formatMoney(line.lineTotal, 'fr')}
            </p>
            {line.quantity > 1 && !isDead ? (
              <p className="text-content-muted beral-price text-xs">
                {formatMoney(line.unitPrice.amount, 'fr')} l&apos;unité
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function Summary({ cart }: { readonly cart: CartView }) {
  return (
    <div className="border-border bg-surface rounded-card border p-5 lg:sticky lg:top-40">
      <h2 className="text-content font-semibold">Récapitulatif</h2>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-content-muted">Sous-total</dt>
          <dd className="beral-price text-content font-medium">
            {formatMoney(cart.subtotal, 'fr')}
          </dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-content-muted">Livraison estimée</dt>
          <dd className="beral-price text-content font-medium">
            {cart.shippingEstimate === null ? (
              <span className="text-content-muted">À calculer</span>
            ) : cart.isShippingFree ? (
              <span className="text-success-500">Offerte</span>
            ) : (
              formatMoney(cart.shippingEstimate, 'fr')
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

      {/* Le montant restant pour la livraison offerte est l'un des leviers les plus
          efficaces sur le panier moyen : il est donc affiché, pas seulement calculé. */}
      {cart.remainingForFreeShipping && cart.remainingForFreeShipping.amountMinor > 0 ? (
        <p className="border-gold-300 bg-gold-50 text-gold-900 rounded-control mt-4 flex items-start gap-2 border px-3 py-2.5 text-xs">
          <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Plus que{' '}
            <strong className="beral-price">
              {formatMoney(cart.remainingForFreeShipping, 'fr')}
            </strong>{' '}
            pour la livraison offerte.
          </span>
        </p>
      ) : null}

      <button
        type="button"
        disabled
        title="Le tunnel de commande arrive au lot 5"
        className="beral-btn-gold rounded-control mt-5 w-full px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        Passer la commande
      </button>

      <p className="text-content-muted mt-2 text-center text-xs">
        Le tunnel de commande et le paiement arrivent aux lots 5 et 6.
      </p>

      <Link
        href="/categories"
        className="text-content-muted hover:text-gold-700 mt-4 block text-center text-sm"
      >
        Continuer mes achats
      </Link>

      <p className="text-content-muted mt-4 text-center text-xs">
        Les frais de livraison définitifs seront calculés à la commande, selon votre adresse.
      </p>
    </div>
  );
}

export default async function CartPage() {
  const owner = await getCartOwnerForRead();
  // Aucun cookie de panier : visiteur qui n'a rien ajouté. On n'en crée pas un
  // uniquement pour afficher une page vide.
  const cart = owner ? await getCart(owner) : null;

  if (!cart || cart.lines.length === 0) {
    return (
      <main id="contenu" className="beral-container flex-1 py-10">
        <h1 className="text-content text-xl font-bold sm:text-2xl">Mon panier</h1>

        <div className="border-border bg-surface-muted/50 rounded-card mt-6 border border-dashed px-6 py-16 text-center">
          <ShoppingBag className="text-content-muted mx-auto h-10 w-10" aria-hidden />
          <p className="text-content mt-4 font-medium">Votre panier est vide</p>
          <p className="text-content-muted mt-1 text-sm">
            Parcourez le catalogue et ajoutez vos premiers articles.
          </p>
          <Link
            href="/categories"
            className="beral-btn-gold rounded-control mt-6 inline-block px-6 py-3 font-semibold"
          >
            Découvrir les produits
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-content text-xl font-bold sm:text-2xl">
          Mon panier
          <span className="text-content-muted ms-2 text-sm font-normal">
            {cart.itemCount} article{cart.itemCount > 1 ? 's' : ''}
          </span>
        </h1>

        <form action={clearCartAction}>
          <button
            type="submit"
            className="text-content-muted hover:text-danger-500 text-xs transition-colors"
          >
            Vider le panier
          </button>
        </form>
      </div>

      {cart.hasIssues ? (
        <p
          role="status"
          className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control mt-4 flex items-start gap-2 border px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Certains articles ont changé depuis votre dernière visite. Vérifiez votre panier avant
            de commander.
          </span>
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="border-border bg-surface rounded-card border px-4">
          {cart.lines.map((line) => (
            <Line key={line.id} line={line} />
          ))}
        </ul>

        <Summary cart={cart} />
      </div>
    </main>
  );
}
