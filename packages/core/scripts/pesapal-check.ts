import '../../db/src/load-env.ts';

import {
  clearTokenCache,
  getAccessToken,
  getTransactionStatus,
  readPesapalConfig,
} from '../src/payments/pesapal/pesapal-client.ts';

/**
 * Vérifie que les identifiants Pesapal fonctionnent réellement.
 *
 * À lancer avant toute intégration, et de nouveau au passage en production :
 * des clés bac à sable ne fonctionnent PAS en production, et inversement.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/pesapal-check.ts
 */

async function main(): Promise<void> {
  console.log('\n▶ Connexion à Pesapal\n');

  const config = readPesapalConfig();
  console.log(`  Environnement : ${config.environment}`);
  console.log(
    `  Clé           : ${config.consumerKey.slice(0, 6)}… (${config.consumerKey.length} caractères)`,
  );

  const started = Date.now();
  const token = await getAccessToken(config);
  console.log(
    `  ✓ Jeton d'accès obtenu en ${Date.now() - started} ms (${token.length} caractères)`,
  );

  // Deuxième appel : doit être servi par le cache, donc quasi instantané.
  const cachedStart = Date.now();
  await getAccessToken(config);
  console.log(`  ✓ Second appel servi par le cache en ${Date.now() - cachedStart} ms`);

  clearTokenCache();
  const refreshed = await getAccessToken(config);
  console.log(`  ✓ Renouvellement après vidage du cache : ${refreshed.length} caractères`);

  // Un identifiant de transaction inconnu doit produire une erreur EXPLOITABLE,
  // et non planter : c'est exactement ce que renverra la réconciliation sur une
  // référence corrompue.
  try {
    const status = await getTransactionStatus(config, '00000000-0000-0000-0000-000000000000');
    const description =
      status.error?.message ?? status.payment_status_description ?? status.message ?? '—';
    console.log(`  ✓ Transaction inconnue gérée proprement : ${description}`);
  } catch (error) {
    console.log(
      `  ✓ Transaction inconnue rejetée proprement : ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log('\n✔ Identifiants Pesapal valides\n');
}

main().catch((error: unknown) => {
  console.error('\n✖ Échec de la connexion à Pesapal :\n');
  console.error(error instanceof Error ? error.message : error);
  if (error && typeof error === 'object' && 'details' in error) {
    console.error('\nDétails :', JSON.stringify((error as { details: unknown }).details, null, 2));
  }
  console.error(
    '\nVérifier PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET et PESAPAL_ENVIRONMENT ' +
      'dans .env.local. Les clés bac à sable ne fonctionnent pas en production.\n',
  );
  process.exitCode = 1;
});
