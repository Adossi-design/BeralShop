import { prisma } from '@beralshopp/db';

/**
 * Édition et retrait d'un produit existant.
 *
 * Complète `product-creation.ts` : on pouvait créer un produit et régler son
 * prix, jamais corriger son nom ni le retirer de la vente.
 */

export type ResultatEdition =
  { readonly ok: true } | { readonly ok: false; readonly champ?: string; readonly message: string };

/* ═══════════════════════════ Nom et description ═══════════════════════════ */

/**
 * Corrige le nom et la description.
 *
 * ⚠️ L'ADRESSE (`slug`) N'EST PAS RECALCULÉE, et c'est délibéré. Elle est figée
 * à la création. La changer casserait tous les liens déjà partagés — messages
 * WhatsApp, favoris, résultats Google — et ferait repartir de zéro le
 * référencement de la fiche. Corriger une faute de frappe ne doit pas coûter
 * ça. Une redirection permanente serait la seule façon propre de la changer ;
 * elle viendra si le besoin se présente vraiment.
 */
export async function modifierTextes(
  productId: string,
  nom: string,
  description: string,
): Promise<ResultatEdition> {
  const nomPropre = nom.trim();
  if (nomPropre.length < 3) {
    return { ok: false, champ: 'nom', message: 'Le nom doit faire au moins 3 caractères.' };
  }

  const existe = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!existe) return { ok: false, message: 'Produit introuvable.' };

  await prisma.productTranslation.upsert({
    where: { productId_locale: { productId, locale: 'fr' } },
    update: { name: nomPropre, description: description.trim() || null },
    create: {
      productId,
      locale: 'fr',
      name: nomPropre,
      description: description.trim() || null,
    },
  });

  return { ok: true };
}

/* ═══════════════════════════ Retrait de la vente ═══════════════════════════ */

export interface EtatRetrait {
  /** Nombre de commandes ayant déjà porté ce produit. */
  readonly commandes: number;
  /** Une suppression définitive est-elle envisageable ? */
  readonly suppressionPossible: boolean;
}

export async function etatRetrait(productId: string): Promise<EtatRetrait> {
  const commandes = await prisma.orderItem.count({
    where: { variant: { productId } },
  });
  return { commandes, suppressionPossible: commandes === 0 };
}

/**
 * Archive un produit : il disparaît de la boutique, son historique demeure.
 *
 * C'est le geste par défaut, et il est réversible. Un produit épuisé, une
 * gamme abandonnée, un article saisonnier : rien de tout cela ne justifie de
 * détruire des données.
 */
export async function archiverProduit(
  productId: string,
  archiver: boolean,
): Promise<ResultatEdition> {
  const produit = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!produit) return { ok: false, message: 'Produit introuvable.' };

  await prisma.product.update({
    where: { id: productId },
    data: archiver ? { status: 'ARCHIVED', publishedAt: null } : { status: 'DRAFT' },
  });

  return { ok: true };
}

/**
 * Supprime définitivement un produit.
 *
 * ⚠️ REFUSÉE dès qu'une commande a porté ce produit. Techniquement la
 * suppression serait sans danger — `OrderItem.variantId` passe à NULL et la
 * commande conserve sa copie figée du nom et du prix. Mais le lien vers la
 * fiche serait rompu : impossible, ensuite, de retrouver ce qui a été vendu,
 * de traiter un retour, ou de répondre à un litige. L'archivage rend le même
 * service sans rien perdre.
 */
export async function supprimerProduit(productId: string): Promise<ResultatEdition> {
  const { suppressionPossible, commandes } = await etatRetrait(productId);

  if (!suppressionPossible) {
    return {
      ok: false,
      message:
        `Ce produit figure dans ${commandes} commande(s). Il ne peut pas être supprimé — ` +
        'archivez-le plutôt : il quittera la boutique et l’historique restera consultable.',
    };
  }

  // Les variantes, traductions et images partent en cascade (voir le schéma).
  await prisma.product.delete({ where: { id: productId } });
  return { ok: true };
}
