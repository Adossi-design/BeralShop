import { del, put } from '@vercel/blob';

import { TAILLE_MAX_PHOTO, TYPES_PHOTO_AUTORISES, formaterTaille } from '@beralshopp/shared';

/**
 * Stockage des fichiers téléversés depuis l'administration.
 *
 * POURQUOI UN SERVICE EXTERNE PLUTÔT QUE LE DISQUE
 * Sur Vercel, le système de fichiers est en LECTURE SEULE à l'exécution. Un
 * téléversement qui écrit dans `public/` fonctionne sur un poste de développement
 * et échoue en production — la pire des pannes, celle qui ne se voit qu'une fois
 * en ligne. Les fichiers vont donc dans un stockage d'objets.
 *
 * Vercel Blob est retenu plutôt que Cloudflare R2 : la boutique est déjà chez
 * Vercel, la mise en place tient en un jeton, et il n'y a pas de second
 * fournisseur à surveiller. Pour une boutique tenue par une personne, un service
 * de moins vaut mieux qu'un centime de moins.
 */

/**
 * Les limites viennent de `@beralshopp/shared` : le navigateur les applique
 * avant d'envoyer, ce serveur les réapplique parce qu'un contrôle côté
 * navigateur se contourne. Une seule constante pour les deux — deux valeurs
 * séparées finissent toujours par diverger.
 *
 * Elles y sont passées de 6 à 3 Mo : les 6 Mo annoncés ici étaient
 * inatteignables, deux plafonds plus bas s'appliquant avant. Le détail est
 * documenté dans ce fichier-là.
 */
const TYPES_AUTORISES = new Set<string>(TYPES_PHOTO_AUTORISES);

export type ResultatTeleversement =
  | { readonly ok: true; readonly url: string; readonly taille: number }
  | { readonly ok: false; readonly message: string };

export function stockageConfigure(): boolean {
  return Boolean(process.env['BLOB_READ_WRITE_TOKEN']);
}

/**
 * Valide puis dépose un fichier.
 *
 * La validation est faite ICI, côté serveur, et non dans le formulaire :
 * l'attribut `accept` d'un champ de fichier est une commodité pour l'utilisateur,
 * pas une barrière — n'importe qui peut poster directement sur la route.
 */
export async function televerserImage(
  fichier: File,
  prefixe: string,
): Promise<ResultatTeleversement> {
  if (!stockageConfigure()) {
    return {
      ok: false,
      message:
        'Stockage des images non configuré. Créez un magasin Blob sur Vercel et ' +
        'renseignez BLOB_READ_WRITE_TOKEN.',
    };
  }

  if (fichier.size === 0) return { ok: false, message: 'Fichier vide.' };

  if (fichier.size > TAILLE_MAX_PHOTO) {
    return {
      ok: false,
      message:
        `« ${fichier.name} » pèse ${formaterTaille(fichier.size)}. Maximum ` +
        `${formaterTaille(TAILLE_MAX_PHOTO)} par photo — redimensionnez-la avant de l'envoyer.`,
    };
  }

  if (!TYPES_AUTORISES.has(fichier.type)) {
    return {
      ok: false,
      message: `Format « ${fichier.type || 'inconnu'} » refusé. Formats acceptés : JPEG, PNG, WebP, AVIF.`,
    };
  }

  /**
   * `addRandomSuffix` : deux photos nommées « IMG_1234.jpg » ne doivent pas
   * s'écraser l'une l'autre. Sans lui, téléverser une seconde photo au même nom
   * ferait disparaître la première d'un autre produit.
   */
  try {
    const blob = await put(`${prefixe}/${fichier.name}`, fichier, {
      access: 'public',
      addRandomSuffix: true,
      contentType: fichier.type,
    });
    return { ok: true, url: blob.url, taille: fichier.size };
  } catch {
    // On ne renvoie jamais le message brut du fournisseur : il peut contenir des
    // éléments de configuration interne.
    return { ok: false, message: 'Le téléversement a échoué. Réessayez.' };
  }
}

/**
 * Supprime un fichier du stockage.
 *
 * Ne concerne QUE les fichiers déposés via l'administration. Les photos livrées
 * avec le dépôt (`/images/produits/…`) sont servies depuis le code : les effacer
 * demanderait un déploiement, pas un appel d'API. On les laisse donc, et seule
 * leur référence en base disparaît.
 */
export async function supprimerFichier(url: string): Promise<void> {
  if (!url.startsWith('https://') || !stockageConfigure()) return;

  try {
    await del(url);
  } catch {
    // Un fichier déjà absent ne doit pas empêcher de retirer sa référence en
    // base : sinon une image fantôme resterait affichée pour toujours.
  }
}
