import '../src/load-env.ts';

import { prisma } from '../src/client.ts';

/**
 * Contrôle des cinq critères de recherche exigés par le cahier des charges :
 * nom du produit, catégorie, marque, mots-clés et référence.
 *
 * À relancer après toute modification du vecteur de recherche ou de ses triggers :
 *     pnpm --filter @beralshopp/db exec tsx scripts/search-smoke.ts
 */

let failures = 0;

async function check(critere: string, terme: string, attendu: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ name: string; rank: number }[]>`
    SELECT pt.name,
           ts_rank(p."searchVector", websearch_to_tsquery('fr_unaccent', ${terme})) AS rank
    FROM products p
    JOIN product_translations pt ON pt."productId" = p.id AND pt.locale = 'fr'
    WHERE p."searchVector" @@ websearch_to_tsquery('fr_unaccent', ${terme})
    ORDER BY rank DESC
    LIMIT 4
  `;

  const found = rows.some((r) => r.name.toLowerCase().includes(attendu.toLowerCase()));
  if (found) {
    console.log(`  ✓ ${critere.padEnd(22)} « ${terme} » → ${rows.length} résultat(s)`);
    for (const row of rows.slice(0, 2)) {
      console.log(`      ${row.rank.toFixed(4)}  ${row.name}`);
    }
  } else {
    failures += 1;
    console.error(
      `  ✖ ${critere.padEnd(22)} « ${terme} » → « ${attendu} » absent (${rows.length} résultat(s))`,
    );
  }
}

async function main(): Promise<void> {
  console.log('\n▶ Critères de recherche Beralshopp\n');

  await check('Nom du produit', 'ecouteur bluetooth', 'Écouteur');
  await check('Rubrique parente', 'electronique', '');
  await check('Sous-catégorie', 'peripheriques', 'Souris');
  await check('Marque', 'kivu tech', '');
  await check('Mot-clé', 'powerbank', 'Batterie');
  await check('Référence produit', 'ZEN-ECB-X300', 'Écouteur');

  if (failures === 0) {
    console.log('\n✔ Les cinq critères de recherche fonctionnent\n');
  } else {
    console.error(`\n✖ ${failures} critère(s) en échec\n`);
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
