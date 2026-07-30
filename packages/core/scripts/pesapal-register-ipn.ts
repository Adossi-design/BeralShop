import '../../db/src/load-env.ts';

import { readPesapalConfig, registerIpn } from '../src/payments/pesapal/pesapal-client.ts';

/**
 * Enregistre l'URL de notification (IPN) auprès de Pesapal.
 *
 * À faire UNE FOIS par environnement. L'identifiant obtenu doit être reporté dans
 * PESAPAL_IPN_ID — sans lui, aucune commande ne peut être soumise au paiement.
 *
 *   pnpm pesapal:ipn                              → utilise NEXT_PUBLIC_SITE_URL
 *   pnpm pesapal:ipn -- https://beralshopp.com    → force une URL
 *
 * ⚠️ L'URL doit être PUBLIQUEMENT JOIGNABLE. Pesapal appelle notre serveur depuis
 * Internet : une adresse en localhost ne recevra jamais rien. En développement,
 * utiliser un tunnel (cloudflared, ngrok) ou un déploiement de préversion.
 *
 * Ce n'est pas bloquant pour autant : la réconciliation périodique interroge
 * Pesapal et rattrape les paiements même sans IPN. L'IPN accélère, il ne décide pas.
 */

async function main(): Promise<void> {
  const config = readPesapalConfig();
  const siteUrl = process.argv[2] ?? process.env['NEXT_PUBLIC_SITE_URL'] ?? '';

  if (!siteUrl) {
    console.error('\n✖ Aucune URL. Renseigner NEXT_PUBLIC_SITE_URL ou passer l’URL en argument.\n');
    process.exitCode = 1;
    return;
  }

  const ipnUrl = `${siteUrl.replace(/\/$/, '')}/api/v1/paiements/pesapal/ipn`;

  console.log(`\n▶ Enregistrement IPN Pesapal (${config.environment})\n`);
  console.log(`  URL : ${ipnUrl}`);

  if (/localhost|127\.0\.0\.1/.test(ipnUrl)) {
    console.log(
      '\n  ⚠️ Cette URL est locale : Pesapal ne pourra jamais l’appeler.\n' +
        '     La réconciliation périodique prendra le relais, mais les confirmations\n' +
        '     seront différées de quelques minutes au lieu d’être instantanées.\n',
    );
  }

  const response = await registerIpn(config, ipnUrl);

  if (!response.ipn_id) {
    console.error('\n✖ Enregistrement refusé :\n', JSON.stringify(response, null, 2), '\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\n✔ Enregistré. Reporter cette ligne dans .env.local :\n`);
  console.log(`PESAPAL_IPN_ID="${response.ipn_id}"\n`);
}

main().catch((error: unknown) => {
  console.error('\n✖ Échec :\n', error instanceof Error ? error.message : error);
  if (error && typeof error === 'object' && 'details' in error) {
    console.error(JSON.stringify((error as { details: unknown }).details, null, 2));
  }
  process.exitCode = 1;
});
