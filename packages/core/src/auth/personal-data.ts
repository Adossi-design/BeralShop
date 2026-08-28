import { prisma } from '@beralshopp/db';

import { verifyPassword } from './password.ts';
import { revokeAllSessions } from './session.ts';

/**
 * Droits du client sur ses données : export et effacement.
 *
 * Ces deux fonctions existent parce qu'un client peut les exiger, et qu'il doit
 * pouvoir les exercer SEUL, depuis son compte. Obliger à écrire un e-mail au
 * marchand rendrait le droit théorique.
 */

/* ═══════════════════════════════ EXPORT ═══════════════════════════════ */

/**
 * Tout ce que la boutique détient sur un client, en données brutes.
 *
 * Volontairement exhaustif : un résumé ne remplit pas l'obligation. Le client
 * doit pouvoir vérifier ce qui est réellement stocké, y compris ce qu'il aurait
 * oublié avoir saisi.
 *
 * ⚠️ DEUX CHAMPS SONT DÉLIBÉRÉMENT EXCLUS : `passwordHash` et `totpSecret`.
 * Ce ne sont pas « ses données » au sens utile — ce sont les secrets qui
 * protègent son compte. Les exporter dans un fichier qui transitera par ses
 * téléchargements, sa messagerie ou son cloud affaiblirait sa sécurité au lieu
 * de servir son droit.
 */
export async function exporterDonneesPersonnelles(userId: string): Promise<unknown> {
  const utilisateur = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      locale: true,
      preferredCurrency: true,
      countryCode: true,
      phoneVerifiedAt: true,
      emailVerifiedAt: true,
      role: true,
      isActive: true,
      totpEnabledAt: true,
      termsAcceptedAt: true,
      termsVersion: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,

      addresses: true,

      orders: {
        include: { items: true, events: true, payments: true },
        orderBy: { placedAt: 'desc' },
      },

      reviews: {
        select: {
          id: true,
          productId: true,
          rating: true,
          comment: true,
          status: true,
          createdAt: true,
        },
      },

      notifications: {
        select: {
          id: true,
          channel: true,
          status: true,
          template: true,
          recipient: true,
          createdAt: true,
        },
      },

      /** Métadonnées de connexion : appareils et dates, jamais le jeton lui-même. */
      sessions: {
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          lastSeenAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      },
    },
  });

  if (!utilisateur) return null;

  return {
    exportGenereLe: new Date().toISOString(),
    aPropos:
      'Export complet des données détenues par Beralshopp vous concernant. ' +
      'Le condensé de votre mot de passe et votre secret de double authentification ' +
      'en sont volontairement absents : ce sont des secrets de sécurité, pas des données ' +
      'exploitables, et les diffuser affaiblirait votre compte.',
    compte: utilisateur,
  };
}

/* ═══════════════════════════ EFFACEMENT ═══════════════════════════ */

export type ResultatSuppression =
  | { readonly ok: true; readonly commandesAnonymisees: number }
  | { readonly ok: false; readonly message: string };

/**
 * Valeur inscrite à la place du téléphone sur une commande anonymisée.
 * `contactPhone` est NOT NULL en base : on ne peut pas le vider, on le neutralise.
 */
const TELEPHONE_EFFACE = 'SUPPRIME';

/**
 * Supprime le compte et toutes les données personnelles qui y sont rattachées.
 *
 * ⚠️ LES COMMANDES SONT ANONYMISÉES, PAS SUPPRIMÉES — ET C'EST VOLONTAIRE.
 * Une commande payée est une pièce comptable : le droit fiscal impose de la
 * conserver plusieurs années, et ce droit prime sur l'effacement. On supprime
 * donc TOUTES les données personnelles qu'elle contient — nom, téléphone,
 * e-mail, adresse de livraison, note du client — et l'on garde le strict
 * nécessaire à la comptabilité : montants, dates, statut, articles.
 *
 * Après passage, plus rien dans une commande ne permet de remonter à une
 * personne. C'est bien un effacement au sens du droit, pas un masquage.
 *
 * Le mot de passe est redemandé : sans cela, quelqu'un ayant mis la main sur une
 * session ouverte — téléphone volé, ordinateur partagé — pourrait détruire le
 * compte d'un client.
 */
export async function supprimerCompte(
  userId: string,
  motDePasse: string,
): Promise<ResultatSuppression> {
  const utilisateur = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, role: true },
  });

  if (!utilisateur) return { ok: false, message: 'Compte introuvable.' };

  if (!(await verifyPassword(utilisateur.passwordHash, motDePasse))) {
    return { ok: false, message: 'Mot de passe incorrect.' };
  }

  /**
   * Un administrateur ne peut pas se supprimer lui-même : la boutique se
   * retrouverait sans personne pour traiter les commandes en cours, et le
   * journal d'audit perdrait son dernier responsable identifiable.
   */
  if (utilisateur.role !== 'CLIENT') {
    return {
      ok: false,
      message:
        'Un compte administrateur ne peut pas être supprimé depuis cette page. ' +
        'Faites-le rétrograder en compte client au préalable.',
    };
  }

  const commandesAnonymisees = await prisma.$transaction(async (tx) => {
    /**
     * ORDRE CRITIQUE : anonymiser AVANT de supprimer l'utilisateur.
     * Une fois le compte détruit, `userId` passe à NULL sur les commandes et
     * il devient impossible de retrouver lesquelles anonymiser.
     */
    const { count } = await tx.order.updateMany({
      where: { userId },
      data: {
        shippingAddress: {
          anonymise: true,
          note: 'Adresse effacée à la demande du client.',
        },
        contactPhone: TELEPHONE_EFFACE,
        contactEmail: null,
        customerNote: null,
        internalNote: null,
      },
    });

    // Les relations en cascade emportent adresses, paniers, avis, sessions et
    // jetons de réinitialisation. Celles en SetNull détachent commandes,
    // notifications et journal d'audit.
    await tx.user.delete({ where: { id: userId } });

    return count;
  });

  // Ceinture et bretelles : la cascade a déjà supprimé les sessions, mais si le
  // schéma changeait un jour, cet appel éviterait qu'une session survive au compte.
  await revokeAllSessions(userId).catch(() => undefined);

  return { ok: true, commandesAnonymisees };
}
