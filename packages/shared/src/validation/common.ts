import { z } from 'zod';

import { CURRENCY_CODES } from '../money/currencies.ts';
import { SUPPORTED_LOCALES } from '../money/format.ts';
import { COUNTRIES } from '../geo/countries.ts';

/**
 * Schémas de validation partagés entre le site, l'API et l'application mobile.
 *
 * Règle : AUCUNE donnée n'atteint la logique métier sans être passée par un schéma.
 * Cela vaut pour les formulaires, les routes API et les webhooks des prestataires.
 */

export const localeSchema = z.enum(SUPPORTED_LOCALES);
export const currencySchema = z.enum(CURRENCY_CODES);

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => COUNTRIES.some((country) => country.code === value), {
    message: 'Pays non reconnu.',
  });

/**
 * Numéro de téléphone au format international E.164 (+250788123456).
 * C'est l'identifiant principal du client : en Afrique, beaucoup d'acheteurs n'ont pas
 * d'adresse e-mail mais tous ont un numéro.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(
    z
      .string()
      .regex(
        /^\+[1-9]\d{6,14}$/,
        'Numéro invalide. Utiliser le format international, par exemple +250788123456.',
      ),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Adresse e-mail trop longue.')
  .pipe(z.email('Adresse e-mail invalide.'));

/**
 * Mot de passe. Volontairement sans exigence de caractères spéciaux :
 * les règles complexes poussent les utilisateurs vers des mots de passe plus faibles
 * et prévisibles. La longueur est le facteur déterminant.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128, 'Le mot de passe est trop long.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom est trop court.')
  .max(120, 'Le nom est trop long.');

/** Quantité commandée. Plafonnée pour limiter les commandes frauduleuses. */
export const quantitySchema = z
  .number()
  .int('La quantité doit être un nombre entier.')
  .min(1, 'La quantité minimale est 1.')
  .max(999, 'Quantité maximale dépassée.');

/** Montant en plus petite unité monétaire. Toujours un entier positif. */
export const amountMinorSchema = z
  .number()
  .int('Un montant doit être un entier en plus petite unité de la devise.')
  .min(0, 'Un montant ne peut pas être négatif.')
  .max(Number.MAX_SAFE_INTEGER);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide.');

export const cuidSchema = z.string().min(1).max(64);

/** Pagination par curseur — jamais par OFFSET (voir document 02, §3). */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(60).default(24),
});

export type Pagination = z.infer<typeof paginationSchema>;
