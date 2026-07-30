import '../../db/src/load-env.ts';

import { searchProducts, suggest } from '../src/catalog/search-service.ts';

/**
 * Contrôle du service de recherche à l'exécution.
 * Le SQL brut (CTE, curseur composite, repêchage) ne peut pas être validé par le
 * seul typage : ce script l'exerce réellement contre la base.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/search-smoke.ts
 */

let failures = 0;

function report(label: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.error(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main(): Promise<void> {
  console.log('\n▶ Service de recherche\n');

  const base = await searchProducts({ query: 'ecouteur bluetooth' });
  report(
    'Recherche exacte, sans accent',
    base.items.length > 0 && !base.usedFuzzyFallback,
    `${base.total} résultat(s) — ${base.items[0]?.name ?? ''}`,
  );

  const typo = await searchProducts({ query: 'bluetoth' });
  report(
    'Repêchage sur faute de frappe',
    typo.items.length > 0 && typo.usedFuzzyFallback,
    typo.items[0]?.name ?? 'aucun résultat',
  );

  const nothing = await searchProducts({ query: 'zzzzqqqqxxxx' });
  report('Requête sans résultat', nothing.items.length === 0 && nothing.total === 0);

  const category = await searchProducts({ query: 'kivu', categorySlug: 'informatique' });
  const allInformatique = category.items.every((item) =>
    (item.categorySlug ?? '').startsWith('informatique'),
  );
  report(
    'Filtre catégorie, sous-catégories incluses',
    category.items.length > 0 && allInformatique,
    `${category.items.length} produit(s)`,
  );

  const promo = await searchProducts({ query: 'kivu', onSaleOnly: true });
  report(
    'Filtre promotion',
    promo.items.length > 0 && promo.items.every((item) => item.price.isOnSale),
    `${promo.items.length} en promotion`,
  );

  const cheap = await searchProducts({ query: 'kivu', priceMaxMinor: 10_000 });
  report(
    'Filtre prix maximum',
    cheap.items.every((item) => item.price.amount.amountMinor <= 10_000),
    `${cheap.items.length} produit(s) ≤ 10 000 Frw`,
  );

  const asc = await searchProducts({ query: 'kivu', sort: 'price_asc' });
  const prices = asc.items.map((item) => item.price.amount.amountMinor);
  const sorted = [...prices].sort((a, b) => a - b);
  report(
    'Tri par prix croissant',
    JSON.stringify(prices) === JSON.stringify(sorted),
    prices.join(', '),
  );

  // Pagination : deux pages de 2, aucun doublon, aucun produit sauté.
  const page1 = await searchProducts({ query: 'kivu', limit: 2 });
  const page2 = page1.nextCursor
    ? await searchProducts({ query: 'kivu', limit: 2, cursor: page1.nextCursor })
    : null;
  const ids1 = page1.items.map((i) => i.id);
  const ids2 = page2?.items.map((i) => i.id) ?? [];
  const overlap = ids1.filter((id) => ids2.includes(id));
  report(
    'Pagination par curseur sans doublon',
    page1.items.length === 2 && ids2.length > 0 && overlap.length === 0,
    `page 1 : ${ids1.length}, page 2 : ${ids2.length}, doublons : ${overlap.length}`,
  );

  const hints = await suggest('elect');
  report(
    'Suggestions — catégorie en premier',
    hints.length > 0 && hints[0]?.type === 'category',
    hints.map((h) => `${h.type}:${h.label}`).join(' | ') || 'aucune',
  );

  // Le cas décisif : un mot INCOMPLET. La recherche plein texte échoue ici,
  // d'où l'ILIKE trigramme.
  const partial = await suggest('ecout');
  report(
    'Suggestions sur mot incomplet « ecout »',
    partial.some((h) => h.type === 'product'),
    partial.map((h) => h.label).join(' | ') || 'aucune',
  );

  const brandPartial = await suggest('kiv');
  report(
    'Suggestions sur marque incomplète « kiv »',
    brandPartial.length > 0,
    `${brandPartial.length} suggestion(s)`,
  );

  const tooShort = await suggest('e');
  report('Suggestions ignorées sous 2 caractères', tooShort.length === 0);

  if (failures === 0) console.log('\n✔ Service de recherche opérationnel\n');
  else {
    console.error(`\n✖ ${failures} contrôle(s) en échec\n`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('\n✖ Contrôle interrompu :\n', error);
  process.exitCode = 1;
});
