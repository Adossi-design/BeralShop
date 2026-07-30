import {
  BASE_CURRENCY,
  type CurrencyCode,
  type Money,
  add,
  discountPercent,
  money,
} from '@beralshopp/shared';

/**
 * Calcul des prix affichés.
 *
 * Rappel de la règle produit : les prix du catalogue sont saisis et stockés uniquement
 * en RWF. Toute autre devise est un affichage calculé, jamais une valeur stockée
 * (voir docs/03). La conversion arrive en V2 ; l'interface la prévoit déjà pour que
 * son ajout ne touche à aucun appelant.
 */

export interface PriceView {
  /** Prix à payer. */
  readonly amount: Money;
  /** Ancien prix barré. `null` s'il n'y a pas de promotion. */
  readonly compareAt: Money | null;
  /** Remise en pourcentage entier, pour le badge « -25 % ». `null` hors promotion. */
  readonly discountPercent: number | null;
  readonly isOnSale: boolean;
}

export interface PriceInput {
  readonly basePriceMinor: number;
  readonly compareAtPriceMinor: number | null;
  /** Écart de prix de la variante choisie. Peut être négatif. */
  readonly variantDeltaMinor?: number;
  readonly currency?: CurrencyCode;
}

/**
 * Construit la vue de prix d'un produit ou d'une variante.
 *
 * Un « ancien prix » inférieur ou égal au prix courant n'est PAS une promotion : on
 * l'ignore au lieu d'afficher une remise négative. Cela arrive dès qu'un administrateur
 * baisse un prix sans penser à retirer le prix barré.
 */
export function buildPriceView(input: PriceInput): PriceView {
  const currency = input.currency ?? BASE_CURRENCY;
  const delta = input.variantDeltaMinor ?? 0;

  const amount = add(money(input.basePriceMinor, currency), money(delta, currency));

  if (input.compareAtPriceMinor === null || input.compareAtPriceMinor <= 0) {
    return { amount, compareAt: null, discountPercent: null, isOnSale: false };
  }

  // L'écart de variante s'applique aussi à l'ancien prix, sinon la remise affichée
  // serait fausse sur les variantes plus chères.
  const compareAt = add(money(input.compareAtPriceMinor, currency), money(delta, currency));
  const percent = discountPercent(amount, compareAt);

  if (percent === null) {
    return { amount, compareAt: null, discountPercent: null, isOnSale: false };
  }

  return { amount, compareAt, discountPercent: percent, isOnSale: true };
}

/**
 * Prix d'appel d'un produit à plusieurs variantes : « à partir de … ».
 * On retient la variante active la moins chère.
 */
export function buildFromPriceView(
  input: Omit<PriceInput, 'variantDeltaMinor'>,
  variantDeltas: readonly number[],
): PriceView & { readonly hasMultiplePrices: boolean } {
  const activeDeltas = variantDeltas.length > 0 ? variantDeltas : [0];
  const minDelta = Math.min(...activeDeltas);
  const maxDelta = Math.max(...activeDeltas);

  return {
    ...buildPriceView({ ...input, variantDeltaMinor: minDelta }),
    hasMultiplePrices: minDelta !== maxDelta,
  };
}
