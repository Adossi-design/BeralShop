// ⚠️ Doit rester le tout premier import : charge DATABASE_URL avant que le client
// Prisma ne soit évalué. Inverser ces deux lignes casse l'amorçage.
import '../src/load-env.ts';

import { COUNTRIES, CURRENCIES } from '@beralshopp/shared';

import { prisma } from '../src/client.ts';
import { CATEGORY_COUNT, CATEGORY_TREE } from './categories.ts';
import { DEMO_BRANDS, DEMO_PRODUCTS } from './demo-products.ts';

/**
 * Amorçage de la base.
 *
 * Deux niveaux :
 *   1. DONNÉES DE RÉFÉRENCE (devises, pays, vendeur par défaut, zones de livraison).
 *      Toujours appliquées, y compris en production. L'opération est idempotente :
 *      relancer le seed ne duplique rien et n'écrase aucun réglage métier.
 *   2. DONNÉES DE DÉMONSTRATION (catégories et produits d'exemple).
 *      Uniquement si SEED_DEMO_DATA=true. À ne JAMAIS activer en production.
 */

/** Pays ouverts à la vente au lancement, avec leurs prestataires de paiement. */
const LAUNCH_MARKETS: Record<string, { providers: string[]; shipping: boolean }> = {
  // Pesapal couvre le Rwanda et encaisse en RWF — vérifié dans leur documentation.
  RW: { providers: ['pesapal'], shipping: true },
};

async function seedCurrencies(): Promise<void> {
  for (const currency of Object.values(CURRENCIES)) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        minorUnitExponent: currency.minorUnitExponent,
        symbol: currency.symbol,
        symbolPosition: currency.symbolPosition,
        displayRounding: currency.displayRounding,
      },
      create: {
        code: currency.code,
        name: currency.name,
        minorUnitExponent: currency.minorUnitExponent,
        symbol: currency.symbol,
        symbolPosition: currency.symbolPosition,
        displayRounding: currency.displayRounding,
      },
    });
  }
  console.log(`  ✓ ${Object.keys(CURRENCIES).length} devises`);
}

async function seedCountries(): Promise<void> {
  for (const country of COUNTRIES) {
    const market = LAUNCH_MARKETS[country.code];

    await prisma.country.upsert({
      where: { code: country.code },
      // On ne réactive/désactive jamais un pays au re-seed : c'est un réglage
      // commercial qui appartient à l'admin, pas au code.
      update: {
        name: country.name,
        defaultCurrency: country.currency,
        defaultLocale: country.defaultLocale,
        phonePrefix: country.phonePrefix,
        addressFormat: country.addressFormat,
      },
      create: {
        code: country.code,
        name: country.name,
        defaultCurrency: country.currency,
        defaultLocale: country.defaultLocale,
        phonePrefix: country.phonePrefix,
        addressFormat: country.addressFormat,
        isSellingEnabled: market !== undefined,
        isShippingEnabled: market?.shipping ?? false,
        enabledPaymentProviders: market?.providers ?? [],
      },
    });
  }

  const open = Object.keys(LAUNCH_MARKETS).join(', ');
  console.log(`  ✓ ${COUNTRIES.length} pays référencés — ouverts à la vente : ${open}`);
}

async function seedDefaultVendor(): Promise<string> {
  const vendor = await prisma.vendor.upsert({
    where: { slug: 'beralshopp' },
    update: {},
    create: {
      slug: 'beralshopp',
      name: 'Beralshopp',
      isActive: true,
      commissionBp: 0,
    },
  });
  console.log('  ✓ Vendeur par défaut : Beralshopp');
  return vendor.id;
}

async function seedShipping(): Promise<void> {
  const rwanda = await prisma.country.findUnique({ where: { code: 'RW' } });
  if (!rwanda) return;

  const existing = await prisma.shippingZone.findFirst({
    where: { countryCode: 'RW', name: 'Kigali' },
  });
  if (existing) {
    console.log('  · Zones de livraison déjà en place');
    return;
  }

  /**
   * Décision du propriétaire (30 juillet 2026) : livraison GRATUITE partout au
   * Rwanda, délai annoncé de 2 semaines. Le prix du transport est absorbé dans
   * le prix des produits — modèle assumé tant que le volume reste faible.
   * `freeAboveMinor` est nul : inutile de promettre « offert au-delà de X »
   * quand tout est offert.
   */
  await prisma.shippingZone.create({
    data: {
      countryCode: 'RW',
      name: 'Kigali',
      regions: ['Kigali'],
      isActive: true,
      rates: {
        create: [
          {
            name: 'Livraison standard',
            priceMinor: 0,
            currency: 'RWF',
            freeAboveMinor: null,
            minDeliveryDays: 7,
            maxDeliveryDays: 14,
          },
        ],
      },
    },
  });

  await prisma.shippingZone.create({
    data: {
      countryCode: 'RW',
      name: 'Reste du Rwanda',
      regions: [],
      isActive: true,
      rates: {
        create: [
          {
            name: 'Livraison province',
            priceMinor: 0,
            currency: 'RWF',
            freeAboveMinor: null,
            minDeliveryDays: 7,
            maxDeliveryDays: 14,
          },
        ],
      },
    },
  });

  console.log('  ✓ Zones et tarifs de livraison (Rwanda)');
}

/**
 * Taxonomie réelle Beralshopp — amorcée dans TOUS les environnements.
 *
 * `update: {}` est délibéré : on crée ce qui manque, on ne touche jamais à ce qui
 * existe. Un renommage ou un masquage fait depuis l'admin survit donc à un re-seed.
 */
async function seedCategories(): Promise<void> {
  let position = 0;

  for (const parent of CATEGORY_TREE) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {},
      create: {
        slug: parent.slug,
        position: position++,
        iconName: parent.icon,
        isActive: true,
        translations: { create: [{ locale: 'fr', name: parent.name }] },
      },
    });

    for (const [index, child] of (parent.children ?? []).entries()) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: {},
        create: {
          slug: child.slug,
          parentId: created.id,
          position: index,
          isActive: true,
          translations: { create: [{ locale: 'fr', name: child.name }] },
        },
      });
    }
  }

  console.log(
    `  ✓ ${CATEGORY_COUNT} catégories (${CATEGORY_TREE.length} rubriques et leurs sous-catégories)`,
  );
}

async function seedDemoBrands(): Promise<void> {
  for (const brand of DEMO_BRANDS) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: { slug: brand.slug, name: brand.name },
    });
  }
  console.log(`  ✓ ${DEMO_BRANDS.length} marques de démonstration`);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedDemoProducts(vendorId: string): Promise<void> {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const brands = await prisma.brand.findMany({ select: { id: true, slug: true } });
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const brandId = new Map(brands.map((b) => [b.slug, b.id]));

  let created = 0;

  for (const demo of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { sku: demo.sku } });
    if (existing) continue;

    await prisma.product.create({
      data: {
        sku: demo.sku,
        slug: demo.slug,
        vendorId,
        categoryId: categoryId.get(demo.categorySlug) ?? null,
        brandId: demo.brandSlug ? (brandId.get(demo.brandSlug) ?? null) : null,
        basePriceMinor: demo.basePriceMinor,
        compareAtPriceMinor: demo.compareAtPriceMinor ?? null,
        currency: 'RWF',
        status: 'ACTIVE',
        isFeatured: demo.isFeatured ?? false,
        salesCount: demo.salesCount,
        ratingAvg: demo.ratingAvg,
        ratingCount: demo.ratingCount,
        publishedAt: daysAgo(demo.publishedDaysAgo),
        translations: {
          create: [
            {
              locale: 'fr',
              name: demo.name,
              description: demo.description,
              keywords: demo.keywords,
              specifications: demo.specifications,
            },
          ],
        },
        variants: {
          create: demo.variants.map((variant) => ({
            sku: `${demo.sku}-${variant.suffix}`,
            options: variant.options,
            priceDeltaMinor: variant.priceDeltaMinor ?? 0,
            stockQuantity: variant.stock,
            reservedQuantity: 0,
            isActive: true,
          })),
        },
      },
    });
    created += 1;
  }

  const variantCount = DEMO_PRODUCTS.reduce((n, p) => n + p.variants.length, 0);
  console.log(
    created > 0
      ? `  ✓ ${created} produits de démonstration (${variantCount} variantes)`
      : '  · Produits de démonstration déjà présents',
  );
}

async function main(): Promise<void> {
  console.log('\n▶ Amorçage de la base Beralshopp\n');

  console.log('Données de référence :');
  await seedCurrencies();
  await seedCountries();
  const vendorId = await seedDefaultVendor();
  await seedShipping();
  await seedCategories();

  if (process.env['SEED_DEMO_DATA'] === 'true') {
    console.log('\nDonnées de démonstration :');
    await seedDemoBrands();
    await seedDemoProducts(vendorId);
  } else {
    console.log('\n· Données de démonstration ignorées (SEED_DEMO_DATA≠true)');
  }

  console.log('\n✔ Amorçage terminé\n');
}

main()
  .catch((error: unknown) => {
    console.error("\n✖ Échec de l'amorçage :\n", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
