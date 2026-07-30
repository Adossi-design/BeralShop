/**
 * Numéro de commande lisible et unique : BRL-2026-000123
 *
 * Pourquoi pas l'identifiant technique de la base ? Parce qu'un client doit pouvoir le
 * lire au téléphone ou l'écrire sur WhatsApp sans se tromper. Un UUID en est incapable.
 *
 * L'unicité est garantie par une séquence PostgreSQL, pas par du hasard côté application.
 */

export const ORDER_NUMBER_PREFIX = 'BRL';
const ORDER_NUMBER_PATTERN = /^BRL-(\d{4})-(\d{6,})$/;

export function formatOrderNumber(year: number, sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(sequence).padStart(6, '0')}`;
}

export function isValidOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value.trim().toUpperCase());
}

export function parseOrderNumber(value: string): { year: number; sequence: number } | null {
  const match = ORDER_NUMBER_PATTERN.exec(value.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/**
 * Normalise une saisie client dans le champ « suivre ma commande ».
 * Accepte « brl 2026 123 », « BRL-2026-000123 », « 2026-000123 »…
 */
export function normalizeOrderNumberInput(input: string): string | null {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[\s_/]+/g, '-');
  const withPrefix = cleaned.startsWith(ORDER_NUMBER_PREFIX)
    ? cleaned
    : `${ORDER_NUMBER_PREFIX}-${cleaned.replace(/^-+/, '')}`;

  const parts = withPrefix.split('-').filter(Boolean);
  if (parts.length !== 3) return null;

  const year = Number(parts[1]);
  const sequence = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(sequence)) return null;
  if (year < 2020 || year > 2200 || sequence < 1) return null;

  return formatOrderNumber(year, sequence);
}
