'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Loader2, ShoppingCart, Zap } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { type CartActionState, addToCartAction } from '@/lib/cart-actions';

/**
 * Boutons d'achat.
 *
 * Après un ajout réussi, le bouton confirme pendant trois secondes et un lien vers
 * le panier apparaît — sans redirection automatique. Rediriger de force interrompt
 * la navigation d'un client qui voulait continuer ses achats, et fait chuter le
 * panier moyen.
 */

const INITIAL: CartActionState = {};

function Buttons({ disabled }: { readonly disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="submit"
        name="intent"
        value="cart"
        disabled={disabled || pending}
        className="beral-btn-gold rounded-control inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <ShoppingCart className="h-5 w-5" aria-hidden />
        )}
        {pending ? 'Ajout…' : 'Ajouter au panier'}
      </button>

      {/*
        « Acheter maintenant » soumet LE MÊME formulaire, avec une intention
        différente : l'article est ajouté au panier puis le client part directement
        au tunnel de commande. Un second formulaire dupliquerait la sélection de
        variante et la quantité, avec le risque qu'ils divergent.
      */}
      <button
        type="submit"
        name="intent"
        value="checkout"
        disabled={disabled || pending}
        className="bg-ink-900 hover:bg-ink-800 rounded-control inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap className="h-5 w-5" aria-hidden />
        Acheter maintenant
      </button>
    </div>
  );
}

export function AddToCart({
  variantId,
  quantity,
  disabled,
}: {
  readonly variantId: string;
  readonly quantity: number;
  readonly disabled: boolean;
}) {
  const [state, action] = useActionState(addToCartAction, INITIAL);

  /**
   * On mémorise l'instant où la confirmation a été masquée, et l'on DÉRIVE sa
   * visibilité. Appeler setState de façon synchrone dans un effet déclenche un
   * second rendu en cascade ; ici le seul setState part d'un minuteur, donc
   * de façon asynchrone.
   */
  const [dismissedAt, setDismissedAt] = useState(0);
  const justAdded = Boolean(state.addedAt && state.addedAt > dismissedAt);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setDismissedAt(Date.now()), 3000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />

      {state.error ? (
        <p
          role="alert"
          className="border-danger-500/40 bg-danger-500/5 text-danger-500 rounded-control flex items-start gap-2 border px-4 py-2.5 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}

      {justAdded ? (
        <p
          role="status"
          className="border-success-500/40 bg-success-500/5 text-success-500 rounded-control flex flex-wrap items-center gap-2 border px-4 py-2.5 text-sm"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Ajouté au panier.
          <Link href="/panier" className="font-semibold underline">
            Voir le panier
          </Link>
        </p>
      ) : null}

      <Buttons disabled={disabled} />
    </form>
  );
}
