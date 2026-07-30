import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE_NAME, type SessionUser, validateSession } from '@beralshopp/core';

/**
 * Accès à la session côté serveur.
 *
 * `server-only` en tête : si un composant client importait ce fichier par erreur,
 * la compilation échouerait au lieu d'exposer discrètement le cookie de session au
 * navigateur.
 */

export { SESSION_COOKIE_NAME };

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Utilisateur connecté, ou `null`.
 *
 * `cache` de React déduplique l'appel sur toute la durée d'une requête : l'en-tête,
 * la page et un éventuel composant imbriqué peuvent l'appeler chacun sans provoquer
 * trois requêtes en base.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return validateSession(await getSessionToken());
});

/**
 * Exige une session. Redirige vers la connexion en conservant la destination,
 * pour que le client y revienne automatiquement après s'être identifié.
 */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/connexion?suite=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/** Exige un compte administrateur ou support. */
export async function requireStaff(returnTo: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role === 'CLIENT') {
    // 404 plutôt que 403 : inutile de confirmer l'existence d'un espace admin.
    redirect('/');
  }
  return user;
}

/** Contexte de la requête, journalisé avec chaque session et chaque tentative. */
export async function getRequestContext(): Promise<{
  userAgent: string | null;
  ipAddress: string | null;
}> {
  const headerList = await headers();

  // Vercel et Cloudflare placent l'adresse réelle du client dans ces en-têtes ;
  // l'adresse de connexion directe serait celle du répartiteur de charge.
  const forwarded = headerList.get('x-forwarded-for');
  const ipAddress =
    headerList.get('cf-connecting-ip') ??
    (forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : null) ??
    headerList.get('x-real-ip');

  return {
    userAgent: headerList.get('user-agent'),
    ipAddress: ipAddress && ipAddress.length <= 45 ? ipAddress : null,
  };
}
