import '../src/load-env.ts';

import { prisma } from '../src/client.ts';

/**
 * Réconciliation des réservations de stock.
 *
 * La réservation d'une variante DOIT toujours égaler la somme des quantités des
 * commandes encore en attente de paiement. Toute autre valeur immobilise du stock
 * sans contrepartie : la boutique affiche « rupture » sur des produits pourtant
 * disponibles, et des ventes sont perdues silencieusement.
 *
 * Causes possibles d'une dérive :
 *   • suppression d'une commande DIRECTEMENT en base, sans passer par le service
 *     (à ne jamais faire : l'admin doit ANNULER, ce qui libère le stock) ;
 *   • interruption d'une transaction par une coupure serveur ;
 *   • bug applicatif — c'est justement ce que ce script détecte.
 *
 * Utilisation :
 *   pnpm db:reconcile          → signale les écarts sans rien modifier
 *   pnpm db:reconcile --fix    → corrige
 */

const shouldFix = process.argv.includes('--fix');

async function main(): Promise<void> {
  console.log(`\n▶ Réconciliation du stock ${shouldFix ? '(CORRECTION)' : '(lecture seule)'}\n`);

  const variants = await prisma.productVariant.findMany({
    where: { reservedQuantity: { gt: 0 } },
    select: { id: true, sku: true, stockQuantity: true, reservedQuantity: true },
  });

  let drifted = 0;

  for (const variant of variants) {
    const legitimate = await prisma.orderItem.aggregate({
      where: { variantId: variant.id, order: { status: 'PENDING_PAYMENT' } },
      _sum: { quantity: true },
    });
    const expected = legitimate._sum.quantity ?? 0;

    if (variant.reservedQuantity === expected) continue;

    drifted += 1;
    const delta = variant.reservedQuantity - expected;
    console.log(
      `  ${variant.sku} : réservé ${variant.reservedQuantity}, attendu ${expected} ` +
        `(${delta > 0 ? `${delta} immobilisé(s) à tort` : `${-delta} manquant(s)`})`,
    );

    if (shouldFix) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { reservedQuantity: expected },
      });
    }
  }

  if (drifted === 0) {
    console.log('  ✓ Aucune dérive : toutes les réservations correspondent aux commandes.\n');
  } else if (shouldFix) {
    console.log(`\n✔ ${drifted} variante(s) corrigée(s)\n`);
  } else {
    console.log(`\n⚠ ${drifted} variante(s) en dérive. Relancer avec --fix pour corriger.\n`);
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error('\n✖ Réconciliation interrompue :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
