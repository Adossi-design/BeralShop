import { z } from 'zod';

import { ADDRESS_FIELDS, getCountry } from '../geo/countries.ts';
import {
  countryCodeSchema,
  currencySchema,
  emailSchema,
  fullNameSchema,
  localeSchema,
  passwordSchema,
  phoneSchema,
} from './common.ts';

/**
 * Inscription. Le téléphone est obligatoire, l'e-mail optionnel :
 * c'est l'inverse des plateformes occidentales, et c'est délibéré — beaucoup de clients
 * au Rwanda et en Afrique de l'Ouest n'utilisent pas d'adresse e-mail au quotidien.
 */
export const registerSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  locale: localeSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  acceptsTerms: z.literal(true, 'Vous devez accepter les conditions de vente.'),
});

/** Connexion par téléphone OU e-mail — les deux identifiants sont acceptés. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Saisir un numéro de téléphone ou une adresse e-mail.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const requestPasswordResetSchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['passwordConfirmation'],
  });

export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  email: emailSchema.optional(),
  locale: localeSchema.optional(),
  preferredCurrency: currencySchema.optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['passwordConfirmation'],
  });

/**
 * Adresse de livraison.
 *
 * Tous les champs géographiques sont optionnels dans le schéma de base, puis validés
 * dynamiquement selon le format du pays (voir ADDRESS_FIELDS). Le modèle occidental
 * « rue + code postal » ne fonctionne pas au Rwanda, où l'on adresse par
 * Province / District / Secteur / Cellule / Village, avec un point de repère.
 */
export const addressSchema = z
  .object({
    label: z.string().trim().max(40).optional(),
    recipientName: fullNameSchema,
    phone: phoneSchema,
    countryCode: countryCodeSchema,

    province: z.string().trim().max(80).optional(),
    district: z.string().trim().max(80).optional(),
    sector: z.string().trim().max(80).optional(),
    cell: z.string().trim().max(80).optional(),
    village: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    neighbourhood: z.string().trim().max(80).optional(),
    streetLine: z.string().trim().max(160).optional(),
    postalCode: z.string().trim().max(20).optional(),
    /** Point de repère : souvent plus utile que l'adresse elle-même pour le livreur. */
    landmark: z.string().trim().max(160).optional(),

    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isDefaultShipping: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const country = getCountry(value.countryCode);
    if (!country) return;

    // Le point de repère n'est jamais obligatoire, même quand il est proposé.
    const required = ADDRESS_FIELDS[country.addressFormat].filter((field) => field !== 'landmark');

    for (const field of required) {
      const provided = (value as Record<string, unknown>)[field];
      if (typeof provided !== 'string' || provided.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Champ obligatoire pour ce pays.',
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
