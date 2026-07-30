'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { cancelOrderByCustomer, createOrderFromCart, initiatePayment } from '@beralshopp/core';
import { phoneSchema } from '@beralshopp/shared';

import { getCartOwnerForRead } from './cart';
import { getCurrentUser } from './session';

/**
 * Actions du tunnel de commande.
 *
 * ⚠️ AUCUN MONTANT N'EST ACCEPTÉ DEPUIS LE FORMULAIRE. Ni prix, ni sous-total, ni
 * total, ni frais de port. Le serveur recalcule intégralement la commande à partir
 * du panier et des prix en base. Le formulaire ne transmet que l'adresse, le
 * contact et une éventuelle note.
 */

export interface CheckoutFormState {
  readonly error?: string;
  readonly fieldErrors?: Record<string, string>;
}

/** Champs d'adresse obligatoires au Rwanda. Le format occidental ne s'applique pas. */
const REQUIRED_RW_FIELDS: readonly { name: string; label: string }[] = [
  { name: 'province', label: 'Province' },
  { name: 'district', label: 'District' },
  { name: 'sector', label: 'Secteur' },
];

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

export async function checkoutAction(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const owner = await getCartOwnerForRead();
  if (!owner) return { error: 'Votre panier est vide.' };

  const fieldErrors: Record<string, string> = {};

  const recipientName = text(formData, 'recipientName');
  if (recipientName.length < 2) fieldErrors['recipientName'] = 'Nom du destinataire requis.';

  const phoneResult = phoneSchema.safeParse(text(formData, 'phone'));
  if (!phoneResult.success) {
    fieldErrors['phone'] = phoneResult.error.issues[0]?.message ?? 'Numéro invalide.';
  }

  for (const field of REQUIRED_RW_FIELDS) {
    if (text(formData, field.name).length === 0) {
      fieldErrors[field.name] = `${field.label} obligatoire.`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const phone = phoneResult.success ? phoneResult.data : '';
  const email = text(formData, 'email');

  const result = await createOrderFromCart(owner, {
    address: {
      recipientName,
      phone,
      countryCode: 'RW',
      province: text(formData, 'province'),
      district: text(formData, 'district'),
      sector: text(formData, 'sector'),
      ...(text(formData, 'cell') ? { cell: text(formData, 'cell') } : {}),
      ...(text(formData, 'village') ? { village: text(formData, 'village') } : {}),
      ...(text(formData, 'landmark') ? { landmark: text(formData, 'landmark') } : {}),
    },
    contactPhone: phone,
    ...(email ? { contactEmail: email } : {}),
    ...(text(formData, 'customerNote') ? { customerNote: text(formData, 'customerNote') } : {}),
    saveAddress: formData.get('saveAddress') === 'on',
    // Clé générée SUR LE SERVEUR : une clé fournie par le navigateur pourrait être
    // réutilisée volontairement pour bloquer la création d'une commande légitime.
    idempotencyKey: randomUUID(),
  });

  if (!result.ok) return { error: result.message };

  revalidatePath('/', 'layout');

  // La commande existe ; on enchaîne immédiatement sur le paiement.
  // Si l'initiation échoue, on n'annule PAS la commande : elle reste payable
  // depuis la page de confirmation, et le stock lui reste réservé.
  const payment = await initiatePayment(
    result.order.orderNumber,
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
  );

  redirect(
    payment.ok
      ? payment.redirectUrl
      : `/commande/confirmation/${result.order.orderNumber}?paiement=indisponible`,
  );
}

/**
 * Relance du paiement depuis la page de confirmation.
 * Utile quand le client a fermé la page Pesapal, ou quand un premier essai a échoué.
 */
export async function payOrderAction(formData: FormData): Promise<void> {
  const orderNumber = String(formData.get('orderNumber') ?? '');
  if (!orderNumber) return;

  const payment = await initiatePayment(
    orderNumber,
    process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000',
  );

  redirect(
    payment.ok
      ? payment.redirectUrl
      : `/commande/confirmation/${orderNumber}?paiement=indisponible`,
  );
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const orderNumber = String(formData.get('orderNumber') ?? '');
  const user = await getCurrentUser();
  if (!user || !orderNumber) return;

  await cancelOrderByCustomer(user.id, orderNumber);
  revalidatePath(`/compte/commandes/${orderNumber}`);
  revalidatePath('/compte/commandes');
}
