import { NextResponse } from 'next/server';

import { getCartItemCount } from '@beralshopp/core';

import { getCartOwnerForRead } from '@/lib/cart';
import { getCurrentUser } from '@/lib/session';

/**
 * État de session léger, pour l'en-tête.
 *
 * ⚠️ RAISON D'ÊTRE : PERFORMANCE.
 *
 * Lire le cookie de session directement dans l'en-tête rendait TOUTES les pages du
 * site dynamiques — Next ne peut pas pré-rendre une page dont un composant consulte
 * les cookies. Conséquence : plus aucune mise en cache, une requête serveur et
 * plusieurs requêtes base pour chaque visite, y compris sur des pages qui ne
 * changent jamais.
 *
 * En déportant cette lecture ici, l'en-tête redevient statique et les pages
 * catalogue retrouvent leur pré-rendu.
 *
 * On ne renvoie que le strict nécessaire à l'affichage : un prénom et un compteur.
 * Ni identifiant, ni rôle, ni e-mail — cette réponse transite en clair jusqu'au
 * navigateur.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  const owner = await getCartOwnerForRead();
  const cartCount = owner ? await getCartItemCount(owner) : 0;

  return NextResponse.json(
    {
      firstName: user ? (user.fullName.split(' ')[0] ?? null) : null,
      isStaff: user ? user.role !== 'CLIENT' : false,
      cartCount,
    },
    {
      headers: {
        // Jamais mis en cache par un intermédiaire : cette réponse est propre à
        // chaque visiteur. Un cache partagé afficherait le panier de quelqu'un d'autre.
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
