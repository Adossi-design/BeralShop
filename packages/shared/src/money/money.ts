import { type CurrencyCode, getCurrency } from './currencies.ts';

/**
 * Un montant monétaire. Immuable.
 * `amountMinor` est TOUJOURS un entier exprimé dans la plus petite unité de la devise.
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/** Construit un montant. Refuse tout ce qui n'est pas un entier fini. */
export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new MoneyError(
      `Un montant doit être un entier en plus petite unité, reçu : ${amountMinor}. ` +
        `Utiliser fromMajor() pour convertir depuis une unité principale.`,
    );
  }
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(`Montant hors limites : ${amountMinor}`);
  }
  return Object.freeze({ amountMinor, currency });
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency);
}

/**
 * Convertit une unité principale en montant.
 * `fromMajor(15.5, 'USD')` → 1550 cents. `fromMajor(1500, 'RWF')` → 1500 Frw.
 */
export function fromMajor(major: number, currency: CurrencyCode): Money {
  if (!Number.isFinite(major)) {
    throw new MoneyError(`Valeur invalide : ${major}`);
  }
  const factor = 10 ** getCurrency(currency).minorUnitExponent;
  return money(Math.round(major * factor), currency);
}

/** Renvoie l'unité principale sous forme de nombre. À N'UTILISER QUE POUR L'AFFICHAGE. */
export function toMajor(value: Money): number {
  return value.amountMinor / 10 ** getCurrency(value.currency).minorUnitExponent;
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      `Opération impossible entre devises différentes : ${a.currency} et ${b.currency}. ` +
        `Convertir explicitement avant de calculer.`,
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sum(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>((acc, value) => add(acc, value), zero(currency));
}

/** Multiplie par une quantité entière. Opération exacte, aucun arrondi. */
export function multiply(value: Money, quantity: number): Money {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new MoneyError(`La quantité doit être un entier positif, reçu : ${quantity}`);
  }
  return money(value.amountMinor * quantity, value.currency);
}

/**
 * Applique un pourcentage (remise, TVA, commission).
 * Arrondi au demi-entier supérieur — cohérent avec les usages comptables.
 */
export function percentage(value: Money, percent: number): Money {
  if (!Number.isFinite(percent)) {
    throw new MoneyError(`Pourcentage invalide : ${percent}`);
  }
  return money(Math.round((value.amountMinor * percent) / 100), value.currency);
}

export function negate(value: Money): Money {
  return money(-value.amountMinor, value.currency);
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

export function isPositive(value: Money): boolean {
  return value.amountMinor > 0;
}

export function isNegative(value: Money): boolean {
  return value.amountMinor < 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

/** Renvoie -1, 0 ou 1. Lève une erreur si les devises diffèrent. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function max(a: Money, b: Money): Money {
  return compare(a, b) >= 0 ? a : b;
}

export function min(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}

/** Empêche un total négatif (ex. remise supérieure au sous-total). */
export function clampToZero(value: Money): Money {
  return value.amountMinor < 0 ? zero(value.currency) : value;
}

/**
 * Répartit un montant en `parts` portions dont la somme est EXACTEMENT le montant initial.
 * Le reliquat est distribué sur les premières portions.
 *
 * Indispensable pour ventiler des frais de livraison ou une remise globale sur les
 * lignes d'une commande sans perdre ni créer un franc.
 */
export function allocate(value: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new MoneyError(`Nombre de portions invalide : ${parts}`);
  }
  const base = Math.trunc(value.amountMinor / parts);
  let remainder = value.amountMinor - base * parts;
  const result: Money[] = [];
  for (let i = 0; i < parts; i += 1) {
    const extra = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
    remainder -= extra;
    result.push(money(base + extra, value.currency));
  }
  return result;
}

/**
 * Répartit un montant proportionnellement à des poids (ex. le prix de chaque ligne).
 * La somme des portions est garantie égale au montant initial.
 */
export function allocateByWeights(value: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) {
    throw new MoneyError('Au moins un poids est requis.');
  }
  const total = weights.reduce((acc, weight) => acc + weight, 0);
  if (total <= 0) {
    return allocate(value, weights.length);
  }
  const result: Money[] = [];
  let allocated = 0;
  for (let i = 0; i < weights.length - 1; i += 1) {
    const share = Math.round((value.amountMinor * (weights[i] ?? 0)) / total);
    allocated += share;
    result.push(money(share, value.currency));
  }
  result.push(money(value.amountMinor - allocated, value.currency));
  return result;
}
