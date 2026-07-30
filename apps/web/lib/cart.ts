import 'server-only';

import { randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import type { CartOwner } from '@beralshopp/core';

import { getCurrentUser } from './session';

/**
 * Identification du panier.
 *
 * ⚠️ Distinction essentielle entre LECTURE et ÉCRITURE.
 *
 * Next.js n'autorise la pose d'un cookie que depuis une action serveur ou une route
 * API — jamais pendant le rendu d'une page. Deux fonctions distinctes donc :
 *
 *   • `getCartOwnerForRead` : peut renvoyer `null` (visiteur sans panier). Affiche
 *     simplement un panier vide, sans rien créer.
 *   • `getOrCreateCartOwner` : réservée aux actions, pose le cookie si nécessaire.
 *
 * Créer un cookie à chaque visite anonyme remplirait la table de paniers vides,
 * un par robot d'indexation.
 */

export const CART_COOKIE_NAME = 'beralshopp_panier';
const CART_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Propriétaire du panier pour un affichage. `null` = visiteur sans panier. */
export async function getCartOwnerForRead(): Promise<CartOwner | null> {
  const user = await getCurrentUser();
  if (user) return { kind: 'user', userId: user.id };

  const token = (await cookies()).get(CART_COOKIE_NAME)?.value;
  return token ? { kind: 'guest', sessionToken: token } : null;
}

/** Propriétaire du panier pour une modification. À n'appeler que depuis une action. */
export async function getOrCreateCartOwner(): Promise<CartOwner> {
  const user = await getCurrentUser();
  if (user) return { kind: 'user', userId: user.id };

  const store = await cookies();
  const existing = store.get(CART_COOKIE_NAME)?.value;
  if (existing) return { kind: 'guest', sessionToken: existing };

  const token = randomBytes(24).toString('base64url');
  store.set(CART_COOKIE_NAME, token, {
    // Inaccessible au JavaScript : le panier d'un visiteur n'a aucune raison
    // d'être lisible par un script tiers.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });

  return { kind: 'guest', sessionToken: token };
}

/** Jeton de panier visiteur, pour la fusion au moment de la connexion. */
export async function getGuestCartToken(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE_NAME)?.value;
}

export async function clearGuestCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE_NAME);
}
