/**
 * Prix dégressifs selon la quantité.
 *
 * POURQUOI CE FICHIER EXISTE À PART
 * Le prix unitaire se calcule à DEUX endroits : dans le panier, pour ce que le
 * client voit, et à la validation de la commande, pour ce qu'il paie. Deux
 * implémentations de la même règle finiraient par diverger — et le jour où
 * elles divergent, le total affiché n'est pas le montant encaissé. Il n'y a donc
 * ici qu'une fonction, appelée des deux côtés.
 *
 * ELLE EST PURE : pas d'accès à la base, pas d'horloge, pas d'aléatoire. Elle se
 * teste ligne à ligne, ce qui est le minimum pour du code qui décide de
 * combien quelqu'un est débité.
 */

export interface PalierPrix {
  /** Quantité à partir de laquelle ce prix s'applique. */
  readonly minQuantity: number;
  /** Prix unitaire à ce palier, en plus petite unité monétaire. */
  readonly unitPriceMinor: number;
}

/**
 * Prix unitaire réellement applicable.
 *
 * On retient le palier le plus élevé que la quantité atteint. Pour des seuils à
 * 1, 10 et 50, une commande de 20 pièces prend le palier « 10 ».
 *
 * L'ÉCART DE VARIANTE S'AJOUTE PAR-DESSUS, jamais à la place : une couleur qui
 * coûte 2 000 de plus les coûte à tous les paliers. Sans cela, franchir un seuil
 * ferait disparaître le supplément et deux couleurs de prix différents
 * finiraient au même montant.
 *
 * Les seuils incohérents sont ignorés plutôt que corrigés : un palier à zéro ou
 * à quantité négative vient d'une saisie fautive, et deviner ce qu'elle voulait
 * dire reviendrait à facturer un prix que personne n'a écrit.
 */
export function prixUnitaireMinor(
  basePriceMinor: number,
  variantDeltaMinor: number,
  quantite: number,
  paliers: readonly PalierPrix[],
): number {
  const applicable = paliers
    .filter(
      (p) =>
        Number.isInteger(p.minQuantity) &&
        p.minQuantity >= 1 &&
        Number.isInteger(p.unitPriceMinor) &&
        p.unitPriceMinor >= 0 &&
        quantite >= p.minQuantity,
    )
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  const unitaire = applicable ? applicable.unitPriceMinor : basePriceMinor;

  /* Le prix ne descend jamais sous zéro, même si l'écart de variante est
     négatif et dépasse le prix du palier. Un montant négatif remonterait
     jusqu'au total de la commande et créerait un remboursement fantôme. */
  return Math.max(0, unitaire + variantDeltaMinor);
}

/**
 * Paliers prêts à afficher, ordonnés par quantité croissante.
 *
 * Le palier « 1 » est ajouté s'il manque : la grille montrée au client doit
 * commencer par le prix qu'il paie en achetant une seule pièce, sinon elle
 * laisse croire que le premier prix n'existe qu'à partir de deux.
 */
export function grillePaliers(
  basePriceMinor: number,
  variantDeltaMinor: number,
  paliers: readonly PalierPrix[],
): readonly { readonly minQuantity: number; readonly unitPriceMinor: number }[] {
  const valides = paliers.filter((p) => p.minQuantity >= 1 && p.unitPriceMinor >= 0);
  const avecUn = valides.some((p) => p.minQuantity === 1)
    ? valides
    : [{ minQuantity: 1, unitPriceMinor: basePriceMinor }, ...valides];

  return avecUn
    .map((p) => ({
      minQuantity: p.minQuantity,
      unitPriceMinor: Math.max(0, p.unitPriceMinor + variantDeltaMinor),
    }))
    .sort((a, b) => a.minQuantity - b.minQuantity);
}
