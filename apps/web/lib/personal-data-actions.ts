'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE_NAME, rectifierProfil, supprimerCompte } from '@beralshopp/core';
import { updateProfileSchema } from '@beralshopp/shared';

import { requireUser } from '@/lib/session';

/**
 * Actions liées aux droits du client sur ses données.
 *
 * L'export n'est PAS une action de formulaire mais une route (`/api/v1/mes-donnees`) :
 * une action serveur renvoie du contenu à afficher, pas un fichier à télécharger.
 */

/* ——— Rectification ——— */

export interface EtatRectification {
  readonly erreurs?: Record<string, string>;
  readonly succes?: boolean;
}

export async function rectifierProfilAction(
  _precedent: EtatRectification,
  formData: FormData,
): Promise<EtatRectification> {
  const user = await requireUser('/compte/donnees');

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    currentPassword: formData.get('currentPassword'),
  });

  if (!parsed.success) {
    const erreurs: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const champ = String(issue.path[0] ?? '');
      if (champ && !erreurs[champ]) erreurs[champ] = issue.message;
    }
    return { erreurs };
  }

  const resultat = await rectifierProfil(
    user.id,
    {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
    },
    parsed.data.currentPassword,
  );

  if (!resultat.ok) {
    return { erreurs: { [resultat.champ ?? 'general']: resultat.message } };
  }

  // L'en-tête et l'espace client affichent le nom : ils doivent refléter le
  // changement immédiatement, sans quoi le client croirait l'échec.
  revalidatePath('/compte', 'layout');
  return { succes: true };
}

/* ——— Suppression ——— */

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
