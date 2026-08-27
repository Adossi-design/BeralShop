// ⚠️ Doit rester le tout premier import.
import '../src/load-env.ts';

import { prisma } from '../src/client.ts';
import { DEMO_PRODUCTS } from '../prisma/demo-products.ts';

/**
 * Retire les produits de démonstration de la vitrine.
 *
 * POURQUOI CE SCRIPT EXISTE
 * Les produits de démonstration (Zentro, Kivu Tech, Amani, Beral Home) ont été
 * créés pour développer et tester. Ils n'existent pas. Sur une boutique ouverte
 * au public, un client peut les commander et payer pour un article qui ne sera
 * jamais livré — un litige, un remboursement, et une réputation entamée dès la
 * première semaine.
 *
 * DÉPUBLIER, PAS SUPPRIMER
 * On repasse les produits en brouillon au lieu de les effacer. Supprimer un
 * produit déjà présent dans une commande passée corromprait l'historique, et
 * l'opération serait irréversible. Un brouillon disparaît de la boutique, reste
 * visible dans l'administration, et se republie d'une commande.
 *
 * Réversible : `pnpm db:republier-demo`.
 */

const SKUS_DEMO = DEMO_PRODUCTS.map((p) => p.sku);

const republier = process.argv.includes('--republier');

const resultat = await prisma.product.updateMany({
  where: { sku: { in: SKUS_DEMO } },
  data: republier
    ? { status: 'ACTIVE', publishedAt: new Date() }
    : { status: 'DRAFT', publishedAt: null },
});

const restants = await prisma.product.count({
  where: { status: 'ACTIVE', publishedAt: { not: null } },
});

console.log(
  republier
    ? `\n✓ ${resultat.count} produit(s) de démonstration republié(s).`
    : `\n✓ ${resultat.count} produit(s) de démonstration retiré(s) de la vitrine.`,
);
console.log(`  Produits visibles par les clients : ${restants}`);

if (!republier && restants === 0) {
  console.log(
    '\n⚠ Plus aucun produit visible. La boutique afficherait une vitrine vide.\n' +
      '  Publie de vrais produits avant d’ouvrir, ou republie avec --republier.',
  );
}

console.log('  Les pages se mettent à jour sous 5 minutes.\n');

await prisma.$disconnect();
