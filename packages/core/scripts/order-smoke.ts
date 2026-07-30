import '../../db/src/load-env.ts';

import { prisma } from '@beralshopp/db';

import { addToCart } from '../src/cart/cart-service.ts';
import type { CartOwner } from '../src/cart/types.ts';
import { releaseExpiredReservations } from '../src/inventory/stock-service.ts';
import {
  cancelOrderByCustomer,
  createOrderFromCart,
  getOrderByNumber,
  listUserOrders,
  trackOrder,
  transitionOrder,
} from '../src/orders/order-service.ts';
import type { OrderAddress } from '../src/orders/types.ts';

/**
 * Contrôle des commandes.
 *
 * Vérifie ce qui coûte de l'argent quand ça casse : atomicité de la réservation de
 * stock, idempotence, respect de la machine à états, cloisonnement du suivi public.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/order-smoke.ts
 */

let failures = 0;

function report(label: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.error(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const PHONE = `+25077${Date.now().toString().slice(-7)}`;

const ADDRESS: OrderAddress = {
  recipientName: 'Client Test',
  phone: PHONE,
  countryCode: 'RW',
  province: 'Kigali',
  district: 'Gasabo',
  sector: 'Remera',
  cell: 'Rukiri',
  village: 'Amajyambere',
  landmark: 'En face de la pharmacie',
};

let userId = '';
const createdOrders: string[] = [];

async function stockOf(variantId: string) {
  return prisma.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stockQuantity: true, reservedQuantity: true },
  });
}

async function cleanup(): Promise<void> {
  for (const orderNumber of createdOrders) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });
    if (order) await prisma.order.delete({ where: { id: order.id } });
  }
  await prisma.idempotencyRecord.deleteMany({ where: { scope: 'checkout', userId } });
  if (userId) {
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
}

async function main(): Promise<void> {
  console.log('\n▶ Commandes\n');

  const user = await prisma.user.create({
    data: { fullName: 'Commande Test', phone: PHONE, passwordHash: 'x' },
    select: { id: true },
  });
  userId = user.id;
  const owner: CartOwner = { kind: 'user', userId };

  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { isActive: true, stockQuantity: { gt: 5 } },
    select: { id: true, stockQuantity: true, reservedQuantity: true },
  });

  const before = await stockOf(variant.id);

  // ——— Panier vide ———
  const empty = await createOrderFromCart(owner, {
    address: ADDRESS,
    contactPhone: PHONE,
    idempotencyKey: `vide_${Date.now()}`,
  });
  report('Commande refusée sur panier vide', !empty.ok && empty.failure === 'EMPTY_CART');

  // ——— Commande normale ———
  await addToCart(owner, variant.id, 2);
  const key = `cle_${Date.now()}`;
  const result = await createOrderFromCart(owner, {
    address: ADDRESS,
    contactPhone: PHONE,
    contactEmail: 'test@example.com',
    idempotencyKey: key,
  });

  report('Commande créée', result.ok, result.ok ? result.order.orderNumber : result.message);
  if (!result.ok) return;
  createdOrders.push(result.order.orderNumber);
  const order = result.order;

  report(
    'Numéro au format BRL-AAAA-NNNNNN',
    /^BRL-\d{4}-\d{6,}$/.test(order.orderNumber),
    order.orderNumber,
  );

  report(
    'Total = sous-total + livraison',
    order.total.amountMinor === order.subtotal.amountMinor + order.shipping.amountMinor,
    `${order.subtotal.amountMinor} + ${order.shipping.amountMinor} = ${order.total.amountMinor}`,
  );

  report('Statut initial : en attente de paiement', order.status === 'PENDING_PAYMENT');
  report(
    'Stock réservé, pas encore décrémenté',
    (await stockOf(variant.id)).reservedQuantity === before.reservedQuantity + 2 &&
      (await stockOf(variant.id)).stockQuantity === before.stockQuantity,
  );

  const emptied = await prisma.cartItem.count({ where: { cart: { userId } } });
  report('Panier vidé après commande', emptied === 0);

  report(
    'Copie figée du produit dans la commande',
    order.lines.length === 1 && order.lines[0]!.productName.length > 0,
    order.lines[0]?.productName ?? '',
  );

  // ——— Idempotence ———
  await addToCart(owner, variant.id, 1);
  const replay = await createOrderFromCart(owner, {
    address: ADDRESS,
    contactPhone: PHONE,
    idempotencyKey: key,
  });
  report(
    'Même clé d’idempotence : aucune seconde commande',
    replay.ok && replay.order.orderNumber === order.orderNumber,
  );
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });

  // ——— Suivi public ———
  const tracked = await trackOrder(order.orderNumber, PHONE);
  report('Suivi avec numéro + téléphone', tracked?.orderNumber === order.orderNumber);

  const wrongPhone = await trackOrder(order.orderNumber, '+250700000009');
  report('Suivi refusé avec un mauvais téléphone', wrongPhone === null);

  // ——— Machine à états ———
  const illegal = await transitionOrder(order.orderNumber, 'DELIVERED', { type: 'ADMIN' });
  report(
    'Transition interdite refusée (en attente → livrée)',
    !illegal.ok,
    illegal.ok ? '' : illegal.message,
  );

  const paid = await transitionOrder(order.orderNumber, 'PAID', {
    type: 'SYSTEM',
    note: 'Paiement simulé.',
  });
  report('Passage à PAYÉE accepté', paid.ok);

  const afterPaid = await stockOf(variant.id);
  report(
    'Stock physique décrémenté au paiement, réservation soldée',
    afterPaid.stockQuantity === before.stockQuantity - 2 &&
      afterPaid.reservedQuantity === before.reservedQuantity,
    `stock ${before.stockQuantity} → ${afterPaid.stockQuantity}`,
  );

  const chain = ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
  let chainOk = true;
  for (const step of chain) {
    const r = await transitionOrder(order.orderNumber, step, { type: 'ADMIN' });
    if (!r.ok) chainOk = false;
  }
  report('Parcours complet jusqu’à LIVRÉE', chainOk);

  const finalOrder = await getOrderByNumber(order.orderNumber);
  report(
    'Journal d’événements complet',
    (finalOrder?.events.length ?? 0) >= 6,
    `${finalOrder?.events.length} événements`,
  );
  report('Progression du suivi au maximum', finalOrder?.progress === 5);

  // ——— Annulation et libération du stock ———
  await addToCart(owner, variant.id, 1);
  const second = await createOrderFromCart(owner, {
    address: ADDRESS,
    contactPhone: PHONE,
    idempotencyKey: `cle2_${Date.now()}`,
  });
  if (second.ok) {
    createdOrders.push(second.order.orderNumber);
    const reservedNow = (await stockOf(variant.id)).reservedQuantity;

    const cancelled = await cancelOrderByCustomer(userId, second.order.orderNumber);
    report('Annulation par le client avant paiement', cancelled.ok);
    report(
      'Stock libéré après annulation',
      (await stockOf(variant.id)).reservedQuantity === reservedNow - 1,
    );

    const tooLate = await cancelOrderByCustomer(userId, order.orderNumber);
    report('Annulation refusée sur une commande livrée', !tooLate.ok);
  }

  // ——— Libération automatique ———
  await addToCart(owner, variant.id, 1);
  const third = await createOrderFromCart(owner, {
    address: ADDRESS,
    contactPhone: PHONE,
    idempotencyKey: `cle3_${Date.now()}`,
  });
  if (third.ok) {
    createdOrders.push(third.order.orderNumber);
    // On force l'échéance dans le passé pour simuler l'expiration du délai.
    await prisma.order.update({
      where: { orderNumber: third.order.orderNumber },
      data: { reservationExpiresAt: new Date(Date.now() - 60_000) },
    });

    const reservedBefore = (await stockOf(variant.id)).reservedQuantity;
    const processed = await releaseExpiredReservations();
    const expired = await getOrderByNumber(third.order.orderNumber);

    report('Réservations expirées libérées', processed >= 1, `${processed} commande(s)`);
    report('Commande expirée marquée comme telle', expired?.status === 'EXPIRED');
    report(
      'Stock rendu vendable après expiration',
      (await stockOf(variant.id)).reservedQuantity === reservedBefore - 1,
    );
  }

  const list = await listUserOrders(userId);
  report('Historique du client', list.length >= 3, `${list.length} commande(s)`);

  const after = await stockOf(variant.id);
  report(
    'Aucune réservation résiduelle',
    after.reservedQuantity === before.reservedQuantity,
    `${after.reservedQuantity} = ${before.reservedQuantity}`,
  );

  await cleanup();

  if (failures === 0) console.log('\n✔ Commandes conformes\n');
  else {
    console.error(`\n✖ ${failures} contrôle(s) en échec\n`);
    process.exitCode = 1;
  }
}

main()
  .catch(async (error: unknown) => {
    console.error('\n✖ Contrôle interrompu :\n', error);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
