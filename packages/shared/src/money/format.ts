import { getCurrency } from './currencies.ts';
import type { Money } from './money.ts';

export const SUPPORTED_LOCALES = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

/**
 * Locale technique utilisée pour le formatage des nombres.
 * Pour l'arabe on force les chiffres latins (`-u-nu-latn`) : c'est l'usage dominant
 * en commerce en ligne, les chiffres arabes orientaux (٠١٢٣) désorientent les acheteurs.
 */
const INTL_LOCALES: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-u-nu-latn',
};

/**
 * Formate un montant pour l'affichage.
 *
 * On n'utilise pas `style: 'currency'` d'Intl : il produit « 12 400 RWF » ou « RF 12,400 »
 * selon la plateforme, alors que l'usage local au Rwanda est « 12 400 Frw ».
 * On formate donc le nombre avec Intl et on place nous-mêmes le symbole.
 */
export function formatMoney(value: Money, locale: Locale = DEFAULT_LOCALE): string {
  const definition = getCurrency(value.currency);
  const digits = definition.minorUnitExponent;

  const formatted = new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(value.amountMinor / 10 ** digits);

  return definition.symbolPosition === 'prefix'
    ? `${definition.symbol}${formatted}`
    : `${formatted} ${definition.symbol}`;
}

/** Variante compacte pour les listes denses : « 12,4k Frw ». */
export function formatMoneyCompact(value: Money, locale: Locale = DEFAULT_LOCALE): string {
  const definition = getCurrency(value.currency);
  const major = value.amountMinor / 10 ** definition.minorUnitExponent;

  const formatted = new Intl.NumberFormat(INTL_LOCALES[locale], {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(major);

  return definition.symbolPosition === 'prefix'
    ? `${definition.symbol}${formatted}`
    : `${formatted} ${definition.symbol}`;
}

/** Pourcentage de remise entre un ancien prix et le prix courant. Arrondi à l'entier. */
export function discountPercent(current: Money, compareAt: Money): number | null {
  if (current.currency !== compareAt.currency) return null;
  if (compareAt.amountMinor <= current.amountMinor || compareAt.amountMinor <= 0) return null;
  return Math.round(((compareAt.amountMinor - current.amountMinor) / compareAt.amountMinor) * 100);
}
