import '../../db/src/load-env.ts';

import { prisma } from '@beralshopp/db';

import { addToCart } from '../src/cart/cart-service.ts';
import { createOrderFromCart } from '../src/orders/order-service.ts';

/**
 * Crée une commande de démonstration, pour vérifier le rendu des pages.
 * Affiche le numéro et le téléphone à utiliser sur /suivi.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/make-test-order.ts
 */

const PHONE = `+25076${Date.now().toString().slice(-7)}`;

const user = await prisma.user.create({
  data: { fullName: 'Démonstration Commande', phone: PHONE, passwordHash: 'x' },
  select: { id: true },
});

const variant = await prisma.productVariant.findFirstOrThrow({
  where: { isActive: true, stockQuantity: { gt: 3 } },
  select: { id: true },
});

await addToCart({ kind: 'user', userId: user.id }, variant.id, 2);

const result = await createOrderFromCart(
  { kind: 'user', userId: user.id },
  {
    address: {
      recipientName: 'Démonstration Commande',
      phone: PHONE,
      countryCode: 'RW',
      province: 'Kigali',
      district: 'Gasabo',
      sector: 'Remera',
      landmark: 'En face de la pharmacie',
    },
    contactPhone: PHONE,
    contactEmail: 'demo@example.com',
    customerNote: 'Livrer de préférence le matin.',
    idempotencyKey: `demo_${Date.now()}`,
  },
);

if (result.ok) {
  console.log(`NUMERO=${result.order.orderNumber}`);
  console.log(`TEL=${PHONE}`);
  console.log(`USER=${user.id}`);
} else {
  console.error(`ECHEC : ${result.message}`);
  process.exitCode = 1;
}

await prisma.$disconnect();
