import { prisma } from '@beralshopp/db';

/**
 * Paliers de prix d'un produit, côté administration.
 *
 * Le palier porte un PRIX, pas une remise en pourcentage. Un pourcentage se
 * recalcule à chaque changement du prix de base et dérive sans qu'on s'en
 * aperçoive ; un prix écrit reste ce que le vendeur a décidé, et c'est
 * exactement ce que le client lit sur la fiche.
 */

export interface PalierAdmin {
  readonly id: string;
  readonly minQuantity: number;
  readonly unitPriceMinor: number;
}

export type ResultatPalier =
  { readonly ok: true } | { readonly ok: false; readonly champ?: string; readonly message: string };

export async function listerPaliers(productId: string): Promise<readonly PalierAdmin[]> {
  return prisma.productPriceTier.findMany({
    where: { productId },
    orderBy: { minQuantity: 'asc' },
    select: { id: true, minQuantity: true, unitPriceMinor: true },
  });
}

/**
 * Pose ou remplace le prix d'un seuil.
 *
 * `upsert` plutôt que `create` : saisir deux fois le seuil « 10 » doit corriger
 * le prix, pas échouer sur une contrainte d'unicité que le propriétaire ne peut
 * pas comprendre depuis l'écran.
 */
export async function definirPalier(
  productId: string,
  minQuantity: number,
  unitPriceMinor: number,
): Promise<ResultatPalier> {
  if (!Number.isInteger(minQuantity) || minQuantity < 1) {
    return { ok: false, champ: 'quantite', message: 'La quantité doit valoir au moins 1.' };
  }
  if (!Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) {
    return { ok: false, champ: 'prix', message: 'Prix invalide.' };
  }

  const produit = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePriceMinor: true },
  });
  if (!produit) return { ok: false, message: 'Produit introuvable.' };

  /**
   * Un palier PLUS CHER que le prix de base est refusé.
   *
   * Ce n'est pas une préférence esthétique : la grille annonce au client un
   * tarif dégressif. Un seuil qui augmente le prix à partir de dix pièces
   * transformerait la promesse en piège, et le client ne le verrait qu'au
   * moment de payer.
   */
  if (minQuantity > 1 && unitPriceMinor > produit.basePriceMinor) {
    return {
      ok: false,
      champ: 'prix',
      message:
        'Un palier ne peut pas coûter plus cher que le prix unitaire. ' +
        'Baissez ce prix, ou modifiez le prix de vente du produit.',
    };
  }

  await prisma.productPriceTier.upsert({
    where: { productId_minQuantity: { productId, minQuantity } },
    update: { unitPriceMinor },
    create: { productId, minQuantity, unitPriceMinor },
  });

  return { ok: true };
}

export async function supprimerPalier(id: string): Promise<void> {
  await prisma.productPriceTier.deleteMany({ where: { id } });
}
