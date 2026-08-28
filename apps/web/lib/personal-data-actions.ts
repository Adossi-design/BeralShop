'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE_NAME, supprimerCompte } from '@beralshopp/core';

import { requireUser } from '@/lib/session';

/**
 * Actions liées aux droits du client sur ses données.
 *
 * L'export n'est PAS une action de formulaire mais une route (`/api/v1/mes-donnees`) :
 * une action serveur renvoie du contenu à afficher, pas un fichier à télécharger.
 */

export interface EtatSuppression {
  readonly erreur?: string;
}

export async function supprimerMonCompteAction(
  _precedent: EtatSuppression,
  formData: FormData,
): Promise<EtatSuppression> {
  const user = await requireUser('/compte/donnees');

  const motDePasse = String(formData.get('motDePasse') ?? '');
  if (!motDePasse) return { erreur: 'Saisissez votre mot de passe pour confirmer.' };

  /**
   * Confirmation textuelle en plus du mot de passe. La suppression est
   * irréversible : un double geste volontaire évite le clic malheureux, sans
   * pour autant rendre la démarche plus difficile que l'inscription.
   */
  const confirmation = String(formData.get('confirmation') ?? '')
    .trim()
    .toUpperCase();
  if (confirmation !== 'SUPPRIMER') {
    return { erreur: 'Tapez SUPPRIMER en majuscules pour confirmer.' };
  }

  const resultat = await supprimerCompte(user.id, motDePasse);
  if (!resultat.ok) return { erreur: resultat.message };

  // Le compte n'existe plus : le cookie doit partir immédiatement, sans quoi la
  // navigation suivante présenterait une session pointant vers le néant.
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);

  redirect('/?compte-supprime=1');
}
