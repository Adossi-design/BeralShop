import { z } from 'zod';

import { currencySchema, emailSchema, phoneSchema } from './common.ts';
import { addressSchema } from './account.ts';

/**
 * Validation de commande.
 *
 * ⚠️ Aucun montant n'est accepté depuis le client. Ni prix unitaire, ni sous-total,
 * ni total. Le serveur recalcule intégralement la commande à partir des prix en base.
 * C'est la protection n°1 contre la fraude au prix (document 06).
 */
export const checkoutSchema = z.object({
  /** Adresse existante du carnet, ou nouvelle adresse saisie au moment de la commande. */
  addressId: z.string().min(1).optional(),
  newAddress: addressSchema.optional(),

  shippingZoneId: z.string().min(1).optional(),

  /** Devise d'affichage choisie par le client. Le taux sera figé dans la commande. */
  currency: currencySchema,

  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional(),

  promotionCode: z.string().trim().toUpperCase().max(40).optional(),
  customerNote: z.string().trim().max(500).optional(),

  /**
   * Empêche qu'un double clic ou une reconnexion réseau crée deux commandes.
   * Généré par le client, vérifié et mémorisé côté serveur.
   */
  idempotencyKey: z.string().min(16).max(64),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Résultat renvoyé au client après création de la commande. */
export const checkoutResultSchema = z.object({
  orderNumber: z.string(),
  /** URL de la page de paiement du prestataire vers laquelle rediriger. */
  paymentRedirectUrl: z.string().url(),
});

export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

/** Suivi d'une commande sans être connecté : numéro + téléphone. */
export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(6).max(40),
  phone: phoneSchema,
});
