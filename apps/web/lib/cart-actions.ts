'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { addToCart, clearCart, updateCartItem } from '@beralshopp/core';

import { getCartOwnerForRead, getOrCreateCartOwner } from './cart';

/**
 * Actions du panier.
 *
 * Toute la logique vit dans `@beralshopp/core`. Ces fonctions ne font que résoudre
 * le propriétaire du panier, appeler le service et rafraîchir les pages concernées.
 */

export interface CartActionState {
  readonly error?: string;
  readonly addedAt?: number;
}

export async function addToCartAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const variantId = String(formData.get('variantId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);

  if (!variantId) return { error: 'Choisissez une option avant d’ajouter au panier.' };

  const owner = await getOrCreateCartOwner();
  const result = await addToCart(owner, variantId, quantity);

  if (!result.ok) return { error: result.message };

  // L'en-tête affiche le nombre d'articles : il doit être rafraîchi sur tout le site.
  revalidatePath('/', 'layout');

  // « Acheter maintenant » : l'article est au panier, on enchaîne sur la commande.
  // La redirection a lieu APRÈS l'ajout, jamais avant : si l'ajout échouait, le
  // client arriverait sur un tunnel de commande vide.
  if (formData.get('intent') === 'checkout') {
    redirect('/commande');
  }

  // Horodatage plutôt qu'un simple booléen : deux ajouts successifs du même article
  // produisent des valeurs différentes, ce qui permet de rejouer la confirmation.
  return { addedAt: Date.now() };
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const cartItemId = String(formData.get('cartItemId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 0);
  if (!cartItemId) return;

  const owner = await getCartOwnerForRead();
  if (!owner) return;

  await updateCartItem(owner, cartItemId, quantity);
  revalidatePath('/panier');
  revalidatePath('/', 'layout');
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const cartItemId = String(formData.get('cartItemId') ?? '');
  if (!cartItemId) return;

  const owner = await getCartOwnerForRead();
  if (!owner) return;

  await updateCartItem(owner, cartItemId, 0);
  revalidatePath('/panier');
  revalidatePath('/', 'layout');
}

export async function clearCartAction(): Promise<void> {
  const owner = await getCartOwnerForRead();
  if (!owner) return;

  await clearCart(owner);
  revalidatePath('/panier');
  revalidatePath('/', 'layout');
}
