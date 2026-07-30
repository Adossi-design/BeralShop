// ⚠️ Doit rester le tout premier import.
import '../src/load-env.ts';

import { prisma } from '../src/client.ts';

/**
 * Contrôle de santé du schéma.
 *
 * Vérifie que les objets PostgreSQL ajoutés MANUELLEMENT à la première migration
 * sont bien présents et fonctionnels. Sans eux, la base semble opérationnelle mais
 * la recherche ne renvoie rien et la création de commande échoue — une panne
 * silencieuse, donc la pire des pannes.
 *
 * À relancer après chaque migration et après toute restauration de sauvegarde :
 *     pnpm --filter @beralshopp/db run verify
 */

let failures = 0;

function report(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.error(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function checkExtensions(): Promise<void> {
  const rows = await prisma.$queryRaw<{ extname: string }[]>`
    SELECT extname FROM pg_extension WHERE extname IN ('unaccent', 'pg_trgm')
  `;
  const found = new Set(rows.map((r) => r.extname));
  report('Extension unaccent (recherche sans accents)', found.has('unaccent'));
  report('Extension pg_trgm (tolérance aux fautes de frappe)', found.has('pg_trgm'));
}

async function checkSearchConfiguration(): Promise<void> {
  const rows = await prisma.$queryRaw<{ cfgname: string }[]>`
    SELECT cfgname FROM pg_ts_config WHERE cfgname = 'fr_unaccent'
  `;
  report('Configuration de recherche fr_unaccent', rows.length === 1);
}

async function checkOrderNumberSequence(): Promise<void> {
  const rows = await prisma.$queryRaw<{ n: string }[]>`
    SELECT beralshopp_next_order_number() AS n
  `;
  const value = rows[0]?.n ?? '';
  const valid = /^BRL-\d{4}-\d{6,}$/.test(value);
  report('Séquence des numéros de commande', valid, valid ? value : 'format inattendu');
}

async function checkConstraints(): Promise<void> {
  const expected = [
    'chk_variant_stock_non_negative',
    'chk_variant_reserved_within_stock',
    'chk_product_price_non_negative',
    'chk_order_totals_non_negative',
    'chk_order_item_quantity_positive',
    'chk_cart_item_quantity_positive',
    'chk_review_rating_range',
  ];
  const rows = await prisma.$queryRaw<{ conname: string }[]>`
    SELECT conname FROM pg_constraint WHERE contype = 'c'
  `;
  const found = new Set(rows.map((r) => r.conname));
  const missing = expected.filter((name) => !found.has(name));
  report(
    `Garde-fous d'intégrité (${expected.length} contraintes)`,
    missing.length === 0,
    missing.length ? `manquantes : ${missing.join(', ')}` : 'stock et prix protégés en base',
  );
}

/**
 * Test de bout en bout de la recherche : on crée un produit temporaire, on cherche
 * « ecouteur bluetooth » SANS accent, et on vérifie qu'il remonte. C'est le scénario
 * exact décrit dans le cahier des charges.
 */
async function checkSearchEndToEnd(): Promise<void> {
  const vendor = await prisma.vendor.findUnique({ where: { slug: 'beralshopp' } });
  if (!vendor) {
    report('Recherche plein texte', false, 'vendeur par défaut absent — lancer pnpm db:seed');
    return;
  }

  const sku = `__VERIF_${Date.now()}`;

  try {
    const product = await prisma.product.create({
      data: {
        sku,
        slug: sku.toLowerCase(),
        vendorId: vendor.id,
        basePriceMinor: 15_000,
        status: 'ACTIVE',
        translations: {
          create: [
            {
              locale: 'fr',
              name: 'Écouteur Bluetooth sans fil X300',
              description: 'Autonomie 8 heures, réduction de bruit.',
              keywords: 'casque audio sans fil',
            },
          ],
        },
      },
    });

    // Requête volontairement sans accent, telle que la taperait un client.
    const hits = await prisma.$queryRaw<{ id: string; rank: number }[]>`
      SELECT id,
             ts_rank("searchVector", websearch_to_tsquery('fr_unaccent', 'ecouteur bluetooth')) AS rank
      FROM products
      WHERE "searchVector" @@ websearch_to_tsquery('fr_unaccent', 'ecouteur bluetooth')
        AND id = ${product.id}
    `;

    report(
      'Recherche plein texte « ecouteur bluetooth » (sans accent)',
      hits.length === 1,
      hits.length === 1
        ? 'produit trouvé et pondéré'
        : 'aucun résultat — le trigger ne fonctionne pas',
    );

    // Vérifie que le repêchage sur faute de frappe est possible.
    const fuzzy = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      JOIN product_translations pt ON pt."productId" = p.id AND pt.locale = 'fr'
      WHERE similarity(pt.name, 'ecouteur bluetooth') > 0.15
        AND p.id = ${product.id}
    `;
    report('Repêchage sur faute de frappe (pg_trgm)', fuzzy.length === 1);

    await prisma.product.delete({ where: { id: product.id } });
  } catch (error) {
    report('Recherche plein texte', false, error instanceof Error ? error.message : String(error));
    await prisma.product.deleteMany({ where: { sku } });
  }
}

async function checkReferenceData(): Promise<void> {
  const [currencies, countries, sellingCountries, vendors] = await Promise.all([
    prisma.currency.count(),
    prisma.country.count(),
    prisma.country.count({ where: { isSellingEnabled: true } }),
    prisma.vendor.count(),
  ]);

  report('Devises référencées', currencies > 0, `${currencies}`);
  report('Pays référencés', countries > 0, `${countries}`);
  report('Pays ouverts à la vente', sellingCountries > 0, `${sellingCountries}`);
  report('Vendeur par défaut', vendors > 0);
}

async function main(): Promise<void> {
  console.log('\n▶ Contrôle de santé du schéma Beralshopp\n');

  console.log('Objets PostgreSQL manuels :');
  await checkExtensions();
  await checkSearchConfiguration();
  await checkOrderNumberSequence();
  await checkConstraints();

  console.log('\nDonnées de référence :');
  await checkReferenceData();

  console.log('\nFonctionnement réel :');
  await checkSearchEndToEnd();

  if (failures === 0) {
    console.log('\n✔ Base saine — tous les contrôles passent\n');
  } else {
    console.error(`\n✖ ${failures} contrôle(s) en échec\n`);
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error('\n✖ Contrôle interrompu :\n', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
