import { prisma } from '@beralshopp/db';

/**
 * Gestion des images d'un produit depuis l'administration.
 *
 * Les règles métier vivent ICI et non dans la page : c'est ce qui garantit
 * qu'elles s'appliquent quel que soit l'appelant — formulaire d'aujourd'hui,
 * import en masse ou application mobile demain.
 */

export interface ImageProduit {
  readonly id: string;
  readonly url: string;
  readonly altText: string | null;
  readonly position: number;
  readonly isPrimary: boolean;
}

export async function listerImages(productId: string): Promise<readonly ImageProduit[]> {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
    select: { id: true, url: true, altText: true, position: true, isPrimary: true },
  });
}

/**
 * Rattache une image déjà déposée dans le stockage.
 *
 * La PREMIÈRE image d'un produit devient automatiquement l'image principale :
 * sans cela, un produit se retrouverait avec des photos mais aucune vignette, et
 * s'afficherait avec la pastille de substitution alors que ses images existent.
 */
export async function ajouterImage(
  productId: string,
  url: string,
  altText: string,
  /**
   * Déclinaison à laquelle la photo appartient. Omis, la photo est commune et
   * s'affiche quelle que soit la couleur choisie.
   */
  variantId?: string | null,
): Promise<ImageProduit> {
  return prisma.$transaction(async (tx) => {
    const existantes = await tx.productImage.count({ where: { productId } });
    const derniere = await tx.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return tx.productImage.create({
      data: {
        productId,
        url,
        altText: altText.trim() || null,
        position: (derniere?.position ?? -1) + 1,
        isPrimary: existantes === 0,
        ...(variantId ? { variantId } : {}),
      },
      select: { id: true, url: true, altText: true, position: true, isPrimary: true },
    });
  });
}

/**
 * Désigne l'image principale.
 *
 * Les deux écritures sont dans UNE transaction : entre le retrait de l'ancienne
 * et la pose de la nouvelle, le produit n'a aucune image principale. Un visiteur
 * tombant précisément dans cet intervalle verrait une vignette vide.
 */
export async function definirImagePrincipale(productId: string, imageId: string): Promise<void> {
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);
}

export interface ResultatSuppressionImage {
  /** URL du fichier à effacer du stockage, si elle n'est plus référencée nulle part. */
  readonly urlAEffacer: string | null;
}

/**
 * Retire une image d'un produit.
 *
 * Si l'image supprimée était la principale, la suivante prend sa place — sinon
 * le produit perdrait sa vignette sans que personne ne s'en aperçoive avant de
 * voir la boutique.
 *
 * Le fichier n'est signalé pour effacement QUE s'il n'est plus référencé par
 * aucun autre produit : la même photo peut légitimement servir à deux articles,
 * et l'effacer casserait le second.
 */
export async function supprimerImage(imageId: string): Promise<ResultatSuppressionImage> {
  return prisma.$transaction(async (tx) => {
    const image = await tx.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, url: true, productId: true, isPrimary: true },
    });

    if (!image) return { urlAEffacer: null };

    await tx.productImage.delete({ where: { id: imageId } });

    if (image.isPrimary) {
      const suivante = await tx.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      if (suivante) {
        await tx.productImage.update({ where: { id: suivante.id }, data: { isPrimary: true } });
      }
    }

    const encoreUtilisee = await tx.productImage.count({ where: { url: image.url } });
    return { urlAEffacer: encoreUtilisee === 0 ? image.url : null };
  });
}
