import { Prisma, prisma } from '@beralshopp/db';

/**
 * Gestion du stock.
 *
 * ⚠️ TOUT PASSE PAR DES INSTRUCTIONS SQL ATOMIQUES, jamais par une lecture suivie
 * d'une écriture.
 *
 * Le scénario à empêcher : deux clients achètent simultanément le dernier article.
 * Avec un « lire le stock, vérifier, puis écrire », les deux lectures voient
 * 1 exemplaire, les deux vérifications passent, les deux commandes sont acceptées.
 * Un client est déçu, il faut rembourser, et la confiance est entamée.
 *
 * La condition `stockQuantity - reservedQuantity >= quantité` est donc évaluée
 * DANS le UPDATE : PostgreSQL verrouille la ligne, et la seconde requête voit
 * l'effet de la première. Le nombre de lignes modifiées dit si la réservation a
 * réussi — zéro signifie stock insuffisant.
 *
 * Trois états successifs :
 *   1. RÉSERVÉ   — commande créée, paiement en attente. Stock immobilisé.
 *   2. CONSOMMÉ  — paiement confirmé. Le stock physique est décrémenté.
 *   3. LIBÉRÉ    — paiement échoué, annulé ou expiré. Le stock redevient vendable.
 */

/** Délai laissé au client pour payer avant libération automatique du stock. */
export const RESERVATION_TTL_MINUTES = 30;

type TransactionClient = Prisma.TransactionClient;

export interface StockLine {
  readonly variantId: string;
  readonly quantity: number;
}

/**
 * Réserve du stock pour une variante.
 * Renvoie `false` si le stock disponible est insuffisant — sans jamais lever,
 * car c'est un cas de fonctionnement normal et non une erreur technique.
 */
export async function reserveStock(
  tx: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE product_variants
       SET "reservedQuantity" = "reservedQuantity" + ${quantity},
           "updatedAt" = now()
     WHERE id = ${variantId}
       AND "isActive"
       AND "stockQuantity" - "reservedQuantity" >= ${quantity}
  `;
  return updated === 1;
}

/**
 * Libère une réservation : le stock redevient vendable.
 * `GREATEST(..., 0)` évite qu'une double libération ne rende la valeur négative.
 */
export async function releaseReservation(
  tx: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE product_variants
       SET "reservedQuantity" = GREATEST("reservedQuantity" - ${quantity}, 0),
           "updatedAt" = now()
     WHERE id = ${variantId}
  `;
}

/**
 * Consomme une réservation après paiement confirmé : le stock physique diminue,
 * la réservation disparaît. Le disponible reste donc inchangé — il l'était déjà
 * depuis la réservation.
 */
export async function consumeReservation(
  tx: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE product_variants
       SET "stockQuantity"    = GREATEST("stockQuantity" - ${quantity}, 0),
           "reservedQuantity" = GREATEST("reservedQuantity" - ${quantity}, 0),
           "updatedAt" = now()
     WHERE id = ${variantId}
  `;
}

/** Réserve toutes les lignes, ou aucune. */
export async function reserveAll(
  tx: TransactionClient,
  lines: readonly StockLine[],
): Promise<{ ok: true } | { ok: false; failedVariantId: string }> {
  const reserved: StockLine[] = [];

  for (const line of lines) {
    const success = await reserveStock(tx, line.variantId, line.quantity);
    if (!success) {
      // On défait les réservations déjà posées. Dans une transaction Prisma, lever
      // suffirait à tout annuler ; on reste explicite pour que cette fonction soit
      // aussi utilisable hors transaction.
      for (const done of reserved) {
        await releaseReservation(tx, done.variantId, done.quantity);
      }
      return { ok: false, failedVariantId: line.variantId };
    }
    reserved.push(line);
  }

  return { ok: true };
}

/**
 * Libère le stock des commandes impayées dont le délai est écoulé.
 *
 * À exécuter périodiquement (toutes les 5 minutes). Sans cette tâche, un panier
 * abandonné au moment du paiement immobiliserait du stock indéfiniment, et la
 * boutique afficherait « rupture » sur des produits pourtant disponibles.
 *
 * Renvoie le nombre de commandes traitées.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      reservationExpiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      items: { select: { variantId: true, quantity: true } },
    },
    take: 100,
  });

  let processed = 0;

  for (const order of expired) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await releaseReservation(tx, item.variantId, item.quantity);
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'EXPIRED',
          actorType: 'SYSTEM',
          payload: { reason: 'Délai de paiement dépassé, stock libéré.' },
        },
      });
    });
    processed += 1;
  }

  return processed;
}

/** Stock vendable d'une variante : physique moins réservé. */
export async function getAvailableQuantity(variantId: string): Promise<number> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stockQuantity: true, reservedQuantity: true, isActive: true },
  });

  if (!variant || !variant.isActive) return 0;
  return Math.max(0, variant.stockQuantity - variant.reservedQuantity);
}
