/**
 * Contraintes des fichiers téléversés depuis l'administration.
 *
 * DÉCLARÉES ICI parce que deux endroits doivent s'accorder au pixel près : le
 * navigateur, qui refuse un fichier trop lourd AVANT de l'envoyer, et le
 * serveur, qui refuse à nouveau parce qu'un contrôle côté navigateur se
 * contourne en trois clics. Deux constantes séparées finissent toujours par
 * diverger, et l'écart se paie en refus incompréhensibles.
 *
 * POURQUOI 3 Mo ET NON 6.
 *
 * Le code annonçait 6 Mo. C'était inatteignable, et personne ne s'en était
 * aperçu : deux plafonds plus bas s'appliquaient avant.
 *
 *  1. Next limite le corps d'une action serveur à 1 Mo par défaut. Ce réglage
 *     n'avait jamais été posé. Mesuré : une photo de 4 ko passait, une photo de
 *     5,57 Mo ne faisait RIEN — pas d'image ajoutée, pas de message d'erreur,
 *     pas d'erreur réseau. Un écran qui ne répond pas et ne dit rien.
 *  2. Vercel plafonne le corps d'une requête de fonction à 4,5 Mo, et cela ne
 *     se configure pas. Aucun réglage de Next ne peut passer outre.
 *
 * 3 Mo par photo laisse donc la place à l'enveloppe multipart et à une seconde
 * photo dans le même envoi, sous le plafond de la plateforme. Une photo de
 * produit correcte pèse moins de 1 Mo ; au-delà, c'est une photo brute
 * d'appareil que personne n'a redimensionnée, et qui ralentirait la boutique
 * pour tous les visiteurs.
 *
 * Pour dépasser durablement ces 3 Mo, il faudrait téléverser depuis le
 * navigateur directement vers le stockage, sans faire transiter les octets par
 * la fonction serveur. C'est le seul moyen d'echapper au plafond de 4,5 Mo.
 */

/** Taille maximale d'une photo, en octets. */
export const TAILLE_MAX_PHOTO = 3 * 1024 * 1024;

/**
 * Taille cumulée maximale d'un envoi.
 *
 * Sous les 4 Mo autorisés à l'action serveur, marge gardée pour les autres
 * champs du formulaire et l'enveloppe multipart.
 */
export const TAILLE_MAX_ENVOI = 3.5 * 1024 * 1024;

/** Types réellement acceptés. Une liste blanche, jamais une liste noire. */
export const TYPES_PHOTO_AUTORISES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

/** Valeur de l'attribut `accept` d'un champ de fichier. */
export const ACCEPT_PHOTO = TYPES_PHOTO_AUTORISES.join(',');

/** « 3 Mo », « 750 ko »… pour un message lisible par le propriétaire. */
export function formaterTaille(octets: number): string {
  if (octets >= 1024 * 1024) {
    const mo = octets / (1024 * 1024);
    return `${mo
      .toFixed(mo >= 10 ? 0 : 1)
      .replace('.', ',')
      .replace(',0', '')} Mo`;
  }
  return `${Math.round(octets / 1024)} ko`;
}
