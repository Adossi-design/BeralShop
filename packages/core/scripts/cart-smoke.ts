import '../../db/src/load-env.ts';

import { prisma } from '@beralshopp/db';

import {
  addToCart,
  clearCart,
  getCart,
  getCartItemCount,
  mergeGuestCart,
  updateCartItem,
} from '../src/cart/cart-service.ts';
import type { CartOwner } from '../src/cart/types.ts';

/**
 * Contrôle du panier.
 *
 * Vérifie les propriétés qui protègent le chiffre d'affaires et le client :
 * recalcul systématique des prix, plafonnement par le stock, non-facturation des
 * articles indisponibles, fusion du panier visiteur à la connexion.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/cart-smoke.ts
 */

let failures = 0;

function report(label: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.error(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const GUEST: CartOwner = { kind: 'guest', sessionToken: `test_${Date.now()}` };

async function cleanup(userId?: string): Promise<void> {
  await prisma.cart.deleteMany({
    where: { sessionToken: GUEST.kind === 'guest' ? GUEST.sessionToken : '' },
  });
  if (userId) {
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
}

async function main(): Promise<void> {
  console.log('\n▶ Panier\n');
  await cleanup();

  // Variante en stock, et variante épuisée (« Bleu nuit » du jeu de démonstration).
  const inStock = await prisma.productVariant.findFirstOrThrow({
    where: { isActive: true, stockQuantity: { gt: 5 } },
    select: { id: true, stockQuantity: true, reservedQuantity: true, sku: true },
  });
  const soldOut = await prisma.productVariant.findFirst({
    where: { isActive: true, stockQuantity: 0 },
    select: { id: true, sku: true },
  });

  // ——— Panier vide ———
  const empty = await getCart(GUEST);
  report('Panier vide au départ', empty.lines.length === 0 && empty.subtotal.amountMinor === 0);

  // ——— Ajout ———
  const added = await addToCart(GUEST, inStock.id, 2);
  report(
    'Ajout au panier',
    added.ok,
    added.ok ? `${added.cart.itemCount} article(s)` : added.message,
  );
  if (!added.ok) return;

  const line = added.cart.lines[0];
  report(
    'Total de ligne = prix unitaire × quantité',
    line !== undefined && line.lineTotal.amountMinor === line.unitPrice.amount.amountMinor * 2,
    line ? `${line.lineTotal.amountMinor}` : '',
  );

  // ——— Ajout du même article ———
  const again = await addToCart(GUEST, inStock.id, 1);
  report(
    'Ré-ajout incrémente la ligne au lieu d’en créer une seconde',
    again.ok && again.cart.lines.length === 1 && again.cart.lines[0]?.quantity === 3,
  );

  // ——— Plafonnement par le stock ———
  const available = inStock.stockQuantity - inStock.reservedQuantity;
  const excessive = await addToCart(GUEST, inStock.id, 99);
  report(
    'Quantité plafonnée par le stock disponible',
    excessive.ok && (excessive.cart.lines[0]?.quantity ?? 0) <= available,
    excessive.ok ? `${excessive.cart.lines[0]?.quantity} ≤ ${available}` : '',
  );

  // ——— Article épuisé ———
  if (soldOut) {
    const refused = await addToCart(GUEST, soldOut.id, 1);
    report(
      'Ajout refusé sur un article en rupture',
      !refused.ok && refused.reason === 'INSUFFICIENT_STOCK',
    );
  }

  // ——— Quantité invalide ———
  const invalid = await addToCart(GUEST, inStock.id, 0);
  report('Quantité 0 refusée à l’ajout', !invalid.ok && invalid.reason === 'INVALID_QUANTITY');

  const unknown = await addToCart(GUEST, 'inexistant', 1);
  report('Variante inconnue refusée', !unknown.ok && unknown.reason === 'VARIANT_NOT_FOUND');

  // ——— Modification ———
  const cartNow = await getCart(GUEST);
  const lineId = cartNow.lines[0]?.id ?? '';
  const updated = await updateCartItem(GUEST, lineId, 2);
  report('Modification de quantité', updated.ok && updated.cart.lines[0]?.quantity === 2);

  // ——— Cloisonnement entre paniers ———
  const other: CartOwner = { kind: 'guest', sessionToken: `autre_${Date.now()}` };
  const foreign = await updateCartItem(other, lineId, 5);
  report(
    'Impossible de modifier la ligne du panier d’autrui',
    !foreign.ok && foreign.reason === 'LINE_NOT_FOUND',
  );
  await prisma.cart.deleteMany({
    where: { sessionToken: other.kind === 'guest' ? other.sessionToken : '' },
  });

  // ——— Livraison ———
  const withShipping = await getCart(GUEST);
  report(
    'Livraison estimée et total cohérents',
    withShipping.shippingEstimate !== null &&
      withShipping.total.amountMinor ===
        withShipping.subtotal.amountMinor + withShipping.shippingEstimate.amountMinor,
    withShipping.shippingEstimate
      ? `sous-total ${withShipping.subtotal.amountMinor} + port ${withShipping.shippingEstimate.amountMinor} = ${withShipping.total.amountMinor}`
      : 'aucune zone de livraison',
  );

  // ——— Suppression ———
  const removed = await updateCartItem(GUEST, lineId, 0);
  report('Suppression d’une ligne', removed.ok && removed.cart.lines.length === 0);

  // ——— Fusion à la connexion ———
  await addToCart(GUEST, inStock.id, 2);
  const user = await prisma.user.create({
    data: {
      fullName: 'Panier Test',
      phone: `+25079${Date.now().toString().slice(-7)}`,
      passwordHash: 'x',
    },
    select: { id: true },
  });

  await mergeGuestCart(GUEST.kind === 'guest' ? GUEST.sessionToken : '', user.id);
  const merged = await getCart({ kind: 'user', userId: user.id });
  report(
    'Panier visiteur transféré au compte à la connexion',
    merged.lines.length === 1 && merged.lines[0]?.quantity === 2,
    `${merged.itemCount} article(s)`,
  );

  const guestAfter = await prisma.cart.findUnique({
    where: { sessionToken: GUEST.kind === 'guest' ? GUEST.sessionToken : '' },
    select: { id: true },
  });
  report('Panier visiteur supprimé après fusion', guestAfter === null);

  report(
    'Compteur de l’en-tête cohérent',
    (await getCartItemCount({ kind: 'user', userId: user.id })) === 2,
  );

  await clearCart({ kind: 'user', userId: user.id });
  const cleared = await getCart({ kind: 'user', userId: user.id });
  report('Vidage du panier', cleared.lines.length === 0);

  await cleanup(user.id);

  if (failures === 0) console.log('\n✔ Panier conforme\n');
  else {
    console.error(`\n✖ ${failures} contrôle(s) en échec\n`);
    process.exitCode = 1;
  }
}

main()
  .catch(async (error: unknown) => {
    console.error('\n✖ Contrôle interrompu :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
