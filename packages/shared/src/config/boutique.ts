/**
 * Identité publique de la boutique — coordonnées visibles par les clients.
 *
 * POURQUOI DANS LE CODE ET NON DANS L'ENVIRONNEMENT
 * Ces valeurs étaient auparavant des variables d'environnement. Trois raisons de
 * les avoir rapatriées ici :
 *
 *  1. Ce ne sont pas des secrets. Elles sont imprimées sur chaque page du site.
 *  2. Elles sont identiques en développement et en production. Une variable
 *     d'environnement n'a de sens que pour ce qui CHANGE d'un environnement à
 *     l'autre.
 *  3. Surtout : une variable oubliée dans Vercel faisait disparaître le numéro du
 *     pied de page SANS message d'erreur. Sur un marché où WhatsApp est le canal
 *     de contact attendu, c'est perdre des clients sans jamais le savoir.
 *
 * Ces valeurs étant publiées sur le site, les inscrire dans le dépôt n'ajoute
 * aucune exposition.
 *
 * ⚠️ `pnpm preflight` refuse d'ouvrir la boutique tant qu'une valeur est restée à
 * l'état de marque de réservation.
 */

export const BOUTIQUE = {
  nom: 'Beralshopp',

  /** Numéro appelé par les clients. Format international, sans espaces. */
  telephone: '+250733545633',

  /**
   * Numéro WhatsApp.
   * Identique au numéro d'appel ci-dessus. S'il devait un jour différer — une
   * ligne dédiée au service client, par exemple — c'est ici qu'on les sépare.
   */
  whatsapp: '+250733545633',

  /** Adresse à laquelle les clients écrivent. */
  email: 'beralshopp@gmail.com',

  ville: 'Kigali',
  pays: 'Rwanda',
} as const;

/**
 * Version des documents légaux en vigueur.
 *
 * Enregistrée avec chaque consentement. À INCRÉMENTER à chaque modification de
 * fond des conditions de vente ou de la politique de confidentialité : sans
 * cela, on sait qu'un client a accepté, mais pas QUOI — et la preuve ne vaut
 * plus rien le jour où le texte change.
 *
 * Un changement de version implique de redemander le consentement aux comptes
 * existants ; ce n'est donc pas une valeur qu'on modifie à la légère.
 */
export const TERMS_VERSION = '2026-08-28';

/** Ce qu'affiche le pied de page sous l'icône de localisation. */
export const BOUTIQUE_LOCALISATION = `${BOUTIQUE.ville}, ${BOUTIQUE.pays}`;

/**
 * Fuseau horaire de la boutique.
 *
 * INDISPENSABLE, et invisible en développement. Le serveur de production tourne
 * en UTC ; sans cette valeur, `Intl.DateTimeFormat` s'aligne sur l'horloge de la
 * machine et affiche des heures en retard de deux heures sur Kigali. Une
 * commande passée à 8 h du matin s'afficherait « 6 h 00 » — au client comme au
 * gérant. Sur un poste de supervision, une horloge qui ment est pire que pas
 * d'horloge du tout.
 *
 * Sur le poste de développement, situé au Rwanda, le défaut donnait la bonne
 * heure : le défaut ne se serait donc vu qu'une fois en ligne.
 *
 * TOUT formateur de date destiné à l'écran doit passer cette valeur.
 */
export const FUSEAU_BOUTIQUE = 'Africa/Kigali';

/** Format international : un « + », puis 7 à 15 chiffres, sans espaces. */
const TELEPHONE_VALIDE = /^\+[1-9]\d{6,14}$/;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Coordonnées inutilisables en l'état.
 *
 * Sert au contrôle d'avant-vol : une boutique dont les clients ne peuvent joindre
 * personne ne doit pas ouvrir. On valide la FORME plutôt que de comparer à une
 * liste de marques de réservation — cela attrape aussi les fautes de frappe, qui
 * sont le cas le plus probable une fois les vraies valeurs saisies. Un numéro avec
 * un chiffre en trop échoue aussi silencieusement qu'un numéro fictif.
 */
export function coordonneesIncompletes(): readonly string[] {
  const invalides: string[] = [];

  if (!TELEPHONE_VALIDE.test(BOUTIQUE.telephone)) invalides.push('telephone');
  if (!TELEPHONE_VALIDE.test(BOUTIQUE.whatsapp)) invalides.push('whatsapp');
  if (!EMAIL_VALIDE.test(BOUTIQUE.email)) invalides.push('email');

  return invalides;
}
