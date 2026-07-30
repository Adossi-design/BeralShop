import { type CurrencyCode, type RoundingRule, getCurrency } from './currencies.ts';
import { type Money, MoneyError, money } from './money.ts';

/**
 * Conversion de devise pour AFFICHAGE.
 *
 * Rappel de la règle produit (document 03 du dossier technique) :
 * les prix du catalogue sont stockés uniquement en RWF. Les autres devises ne sont
 * jamais des prix stockés — ce sont des affichages calculés. Cela élimine le risque
 * de deux prix stockés qui se désynchronisent.
 *
 * Au moment où le client valide sa commande, le taux utilisé est COPIÉ dans la commande
 * (`fxRateUsed`) et n'est plus jamais recalculé. Le client paie exactement le montant
 * affiché, même si le taux change à la seconde près.
 */

/** Marge de sécurité par défaut, en pourcentage, contre la volatilité intra-journalière. */
export const DEFAULT_FX_MARGIN_PERCENT = 3;

export interface ConversionOptions {
  /** Marge de sécurité en %. Paramétrable depuis le tableau de bord admin. */
  readonly marginPercent?: number;
  /** Force une règle d'arrondi. Par défaut, celle de la devise cible. */
  readonly rounding?: RoundingRule;
}

export interface ConversionResult {
  readonly amount: Money;
  /** Taux brut utilisé, à figer dans la commande. */
  readonly rate: number;
  readonly marginPercent: number;
}

/**
 * Applique une règle d'arrondi commercial à un montant exprimé en plus petite unité.
 * L'arrondi est toujours vers le HAUT : on ne vend jamais à perte sur la conversion.
 */
export function applyRounding(
  amountMinor: number,
  currency: CurrencyCode,
  rule: RoundingRule,
): number {
  if (amountMinor <= 0) return 0;

  switch (rule) {
    case 'none':
      return Math.ceil(amountMinor);

    case 'up_100':
      return Math.ceil(amountMinor / 100) * 100;

    case 'up_25':
      return Math.ceil(amountMinor / 25) * 25;

    case 'up_99': {
      // Arrondi à l'unité principale supérieure, moins une plus petite unité.
      // 19,43 $ → 19,99 $ ; 20,00 $ reste 20,00 $ (déjà rond, on ne descend pas).
      const factor = 10 ** getCurrency(currency).minorUnitExponent;
      if (factor === 1) {
        // Devise sans décimale : l'arrondi « x,99 » n'a pas de sens, on retombe sur l'unité.
        return Math.ceil(amountMinor);
      }
      const majorCeil = Math.ceil(amountMinor / factor);
      const candidate = majorCeil * factor - 1;
      return candidate >= amountMinor ? candidate : majorCeil * factor + factor - 1;
    }

    default: {
      const exhaustive: never = rule;
      throw new MoneyError(`Règle d'arrondi inconnue : ${String(exhaustive)}`);
    }
  }
}

/**
 * Convertit un montant vers une autre devise.
 *
 * @param rate Taux de change 1 unité principale source → N unités principales cible.
 *             Exemple RWF→USD : 0.00076. Exemple RWF→XAF : 0.44.
 */
export function convert(
  source: Money,
  target: CurrencyCode,
  rate: number,
  options: ConversionOptions = {},
): ConversionResult {
  const marginPercent = options.marginPercent ?? DEFAULT_FX_MARGIN_PERCENT;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new MoneyError(
      `Taux de change invalide (${rate}) pour ${source.currency}→${target}. ` +
        `Un prix ne doit jamais être affiché avec un taux inconnu.`,
    );
  }
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 50) {
    throw new MoneyError(`Marge de change invalide : ${marginPercent}%`);
  }

  if (source.currency === target) {
    return { amount: source, rate: 1, marginPercent: 0 };
  }

  const sourceExponent = getCurrency(source.currency).minorUnitExponent;
  const targetDefinition = getCurrency(target);

  const sourceMajor = source.amountMinor / 10 ** sourceExponent;
  const targetMajor = sourceMajor * rate * (1 + marginPercent / 100);
  const targetMinorRaw = targetMajor * 10 ** targetDefinition.minorUnitExponent;

  const rounded = applyRounding(
    targetMinorRaw,
    target,
    options.rounding ?? targetDefinition.displayRounding,
  );

  return { amount: money(rounded, target), rate, marginPercent };
}
