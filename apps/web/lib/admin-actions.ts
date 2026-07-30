'use server';

import { revalidatePath } from 'next/cache';

import {
  type AdminActor,
  adminChangeOrderStatus,
  adminSetCustomerActive,
  adminSetInternalNote,
  adminSetTracking,
  adminUpdateProductPricing,
  adminUpdateStock,
} from '@beralshopp/core';
import type { OrderStatus } from '@beralshopp/db';

import { getCurrentUser, getRequestContext } from './session';

/**
 * Actions d'administration.
 *
 * Chaque action REVÉRIFIE le rôle. Le layout protège l'affichage, mais une action
 * serveur est un point d'entrée à part entière : elle peut être appelée directement,
 * sans jamais charger la page. Se fier au seul layout laisserait une porte ouverte.
 */

export interface AdminActionState {
  readonly error?: string;
  readonly success?: string;
}

async function requireActor(): Promise<AdminActor | null> {
  const user = await getCurrentUser();
  if (!user || user.role === 'CLIENT') return null;

  const context = await getRequestContext();
  return { id: user.id, ipAddress: context.ipAddress, userAgent: context.userAgent };
}

export async function changeOrderStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const orderNumber = String(formData.get('orderNumber') ?? '');
  const toStatus = String(formData.get('status') ?? '') as OrderStatus;
  const note = String(formData.get('note') ?? '').trim();

  if (!orderNumber || !toStatus) return { error: 'Paramètres manquants.' };

  const result = await adminChangeOrderStatus(actor, orderNumber, toStatus, note || undefined);
  if (!result.ok) return { error: result.message ?? 'Changement refusé.' };

  revalidatePath(`/admin/commandes/${orderNumber}`);
  revalidatePath('/admin/commandes');
  revalidatePath('/admin');
  return { success: 'Statut mis à jour.' };
}

export async function setTrackingAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const orderNumber = String(formData.get('orderNumber') ?? '');
  const trackingNumber = String(formData.get('trackingNumber') ?? '');
  const carrierName = String(formData.get('carrierName') ?? '');

  const result = await adminSetTracking(actor, orderNumber, trackingNumber, carrierName);
  if (!result.ok) return { error: result.message ?? 'Enregistrement refusé.' };

  revalidatePath(`/admin/commandes/${orderNumber}`);
  return { success: 'Numéro de suivi enregistré.' };
}

export async function setInternalNoteAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const orderNumber = String(formData.get('orderNumber') ?? '');
  await adminSetInternalNote(actor, orderNumber, String(formData.get('internalNote') ?? ''));
  revalidatePath(`/admin/commandes/${orderNumber}`);
}

export async function updateProductAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const productId = String(formData.get('productId') ?? '');
  const price = Number(formData.get('basePriceMinor'));
  const compareRaw = String(formData.get('compareAtPriceMinor') ?? '').trim();
  const compareAt = compareRaw === '' ? null : Number(compareRaw);
  const status = String(formData.get('status') ?? 'ACTIVE') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  if (!Number.isFinite(price)) return { error: 'Prix invalide.' };
  if (compareAt !== null && !Number.isFinite(compareAt)) return { error: 'Ancien prix invalide.' };

  const result = await adminUpdateProductPricing(actor, productId, price, compareAt, status);
  if (!result.ok) return { error: result.message ?? 'Modification refusée.' };

  revalidatePath('/admin/produits');
  // Les pages publiques sont régénérées : sans cela, un prix modifié resterait
  // affiché à l'ancien tarif jusqu'à l'expiration du cache.
  revalidatePath('/', 'layout');
  return { success: 'Produit mis à jour.' };
}

export async function updateStockAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const variantId = String(formData.get('variantId') ?? '');
  const stock = Number(formData.get('stockQuantity'));

  if (!Number.isFinite(stock)) return { error: 'Stock invalide.' };

  const result = await adminUpdateStock(actor, variantId, stock);
  if (!result.ok) return { error: result.message ?? 'Modification refusée.' };

  revalidatePath('/admin/produits');
  revalidatePath('/', 'layout');
  return { success: 'Stock mis à jour.' };
}

export async function toggleCustomerAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const userId = String(formData.get('userId') ?? '');
  const isActive = formData.get('isActive') === '1';

  await adminSetCustomerActive(actor, userId, isActive);
  revalidatePath('/admin/clients');
}
