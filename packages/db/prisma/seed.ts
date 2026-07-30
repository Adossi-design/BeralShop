// ⚠️ Doit rester le tout premier import : charge DATABASE_URL avant que le client
// Prisma ne soit évalué. Inverser ces deux lignes casse l'amorçage.
import '../src/load-env.ts';

import { COUNTRIES, CURRENCIES } from '@beralshop/shared';

import { prisma } from '../src/client.ts';

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
    where: { slug: 'beralshop' },
    update: {},
    create: {
      slug: 'beralshop',
      name: 'Beralshop',
      isActive: true,
      commissionBp: 0,
    },
  });
  console.log('  ✓ Vendeur par défaut : Beralshop');
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
            priceMinor: 2000, // 2 000 Frw
            currency: 'RWF',
            freeAboveMinor: 50_000, // Port offert au-delà de 50 000 Frw
            minDeliveryDays: 1,
            maxDeliveryDays: 3,
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
            priceMinor: 3500,
            currency: 'RWF',
            freeAboveMinor: 80_000,
            minDeliveryDays: 2,
            maxDeliveryDays: 6,
          },
        ],
      },
    },
  });

  console.log('  ✓ Zones et tarifs de livraison (Rwanda)');
}

const DEMO_CATEGORIES = [
  { slug: 'electronique', name: 'Électronique', icon: 'smartphone' },
  { slug: 'mode', name: 'Mode & Vêtements', icon: 'shirt' },
  { slug: 'maison', name: 'Maison & Cuisine', icon: 'home' },
  { slug: 'beaute', name: 'Beauté & Santé', icon: 'sparkles' },
  { slug: 'telephonie', name: 'Téléphones & Accessoires', icon: 'phone' },
  { slug: 'informatique', name: 'Informatique', icon: 'laptop' },
  { slug: 'sport', name: 'Sport & Loisirs', icon: 'dumbbell' },
  { slug: 'bebe', name: 'Bébé & Enfant', icon: 'baby' },
];

async function seedDemoCategories(): Promise<void> {
  for (const [index, category] of DEMO_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        position: index,
        iconName: category.icon,
        isActive: true,
        translations: {
          create: [{ locale: 'fr', name: category.name }],
        },
      },
    });
  }
  console.log(`  ✓ ${DEMO_CATEGORIES.length} catégories de démonstration`);
}

async function main(): Promise<void> {
  console.log('\n▶ Amorçage de la base Beralshop\n');

  console.log('Données de référence :');
  await seedCurrencies();
  await seedCountries();
  await seedDefaultVendor();
  await seedShipping();

  if (process.env['SEED_DEMO_DATA'] === 'true') {
    console.log('\nDonnées de démonstration :');
    await seedDemoCategories();
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
