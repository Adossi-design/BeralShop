import '../src/load-env.ts';

import { prisma } from '../src/client.ts';

/**
 * Publication rapide des produits en brouillon.
 *
 * ⚠️ OUTIL DE DÉMARRAGE, PAS UN OUTIL D'EXPLOITATION.
 *
 * Le stock appliqué est une valeur PROVISOIRE destinée à rendre la boutique
 * navigable. Elle ne correspond à aucun inventaire réel : il faut la remplacer par
 * les quantités réelles depuis /admin/produits avant toute vente.
 *
 * Un stock inventé qui reste en place, c'est une survente garantie — le client paie,
 * et il n'y a rien à lui envoyer.
 *
 *     pnpm db:publish            → stock provisoire de 10 par variante
 *     pnpm db:publish -- 25      → stock provisoire de 25
 */

const stock = Number(process.argv[2] ?? 10);

async function main(): Promise<void> {
  if (!Number.isInteger(stock) || stock < 0) {
    console.error('\n✖ Stock invalide. Passer un entier positif.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\n▶ Publication des brouillons — stock provisoire : ${stock}\n`);

  const drafts = await prisma.product.findMany({
    where: { status: 'DRAFT' },
    select: {
      id: true,
      sku: true,
      translations: { where: { locale: 'fr' }, select: { name: true } },
      variants: { select: { id: true, sku: true, reservedQuantity: true } },
    },
  });

  if (drafts.length === 0) {
    console.log('  · Aucun produit en brouillon.\n');
    return;
  }

  for (const product of drafts) {
    for (const variant of product.variants) {
      // On ne descend jamais sous la quantité réservée par des commandes en cours :
      // la contrainte en base refuserait l'écriture, à juste titre.
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stockQuantity: Math.max(stock, variant.reservedQuantity) },
      });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    });

    console.log(
      `  ✓ ${product.sku} — ${product.translations[0]?.name ?? ''}\n` +
        `      ${product.variants.length} variante(s) à ${stock} exemplaire(s)`,
    );
  }

  console.log(
    `\n✔ ${drafts.length} produit(s) publié(s)\n\n` +
      '⚠️ LE STOCK EST PROVISOIRE. Le remplacer par les quantités réelles depuis\n' +
      '   /admin/produits avant d’ouvrir la boutique aux clients.\n',
  );
}

main()
  .catch((error: unknown) => {
    console.error('\n✖ Publication interrompue :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
