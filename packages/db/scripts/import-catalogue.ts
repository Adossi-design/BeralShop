import '../src/load-env.ts';

import { prisma } from '../src/client.ts';
import { REAL_PRODUCTS } from '../prisma/catalogue/produits-reels.ts';

/**
 * Import du catalogue réel.
 *
 * Outil provisoire, en attendant l'éditeur de produits complet dans l'administration.
 * Il permet d'ajouter des produits sans passer par du SQL à la main.
 *
 *     pnpm db:import
 *
 * IDEMPOTENT ET NON DESTRUCTIF : un produit déjà présent n'est pas recréé, et rien
 * de ce qui a été modifié depuis l'administration — prix, stock, statut — n'est
 * écrasé. C'est délibéré : un import ne doit jamais réinitialiser silencieusement
 * un stock que le commerçant vient d'ajuster.
 */

async function main(): Promise<void> {
  console.log('\n▶ Import du catalogue\n');

  const vendor = await prisma.vendor.findUnique({
    where: { slug: 'beralshopp' },
    select: { id: true },
  });
  if (!vendor) {
    console.error('✖ Vendeur par défaut absent. Lancer `pnpm db:seed` d’abord.\n');
    process.exitCode = 1;
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const product of REAL_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { sku: product.sku },
      select: { id: true, status: true },
    });

    if (existing) {
      console.log(`  · ${product.sku} déjà présent (${existing.status}) — inchangé`);
      skipped += 1;
      continue;
    }

    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug },
      select: { id: true },
    });
    if (!category) {
      console.error(
        `  ✖ ${product.sku} : catégorie « ${product.categorySlug} » introuvable — ignoré`,
      );
      continue;
    }

    const brand = product.brandSlug
      ? await prisma.brand.findUnique({
          where: { slug: product.brandSlug },
          select: { id: true },
        })
      : null;

    const isPublished = product.publish === true;

    await prisma.product.create({
      data: {
        sku: product.sku,
        slug: product.slug,
        vendorId: vendor.id,
        categoryId: category.id,
        brandId: brand?.id ?? null,
        basePriceMinor: product.basePriceMinor,
        compareAtPriceMinor: product.compareAtPriceMinor ?? null,
        currency: 'RWF',
        status: isPublished ? 'ACTIVE' : 'DRAFT',
        isFeatured: product.isFeatured ?? false,
        // Sans date de publication, un produit reste invisible même en statut ACTIF :
        // toutes les requêtes du catalogue filtrent dessus.
        publishedAt: isPublished ? new Date() : null,
        translations: {
          create: [
            {
              locale: 'fr',
              name: product.name,
              description: product.description,
              keywords: product.keywords,
              specifications: product.specifications,
            },
          ],
        },
        variants: {
          create: product.variants.map((variant) => ({
            sku: `${product.sku}-${variant.suffix}`,
            options: variant.options,
            priceDeltaMinor: variant.priceDeltaMinor ?? 0,
            stockQuantity: variant.stock,
            reservedQuantity: 0,
            isActive: true,
          })),
        },
      },
    });

    console.log(`  ✓ ${product.sku} créé — ${isPublished ? 'EN VENTE' : 'BROUILLON (invisible)'}`);
    created += 1;
  }

  console.log(`\n✔ ${created} produit(s) créé(s), ${skipped} déjà présent(s)\n`);

  const drafts = await prisma.product.count({ where: { status: 'DRAFT' } });
  if (drafts > 0) {
    console.log(
      `⚠ ${drafts} produit(s) en brouillon, donc invisibles sur la boutique.\n` +
        '  Ajouter les photos, vérifier le prix et le stock, puis passer en « En vente »\n' +
        '  depuis /admin/produits.\n',
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error('\n✖ Import interrompu :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
