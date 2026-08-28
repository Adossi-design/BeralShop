import '../../db/src/load-env.ts';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '@beralshopp/db';
import { BOUTIQUE, coordonneesIncompletes } from '@beralshopp/shared';

import { getAccessToken, readPesapalConfig } from '../src/payments/pesapal/pesapal-client.ts';

/**
 * Contrôle avant mise en ligne.
 *
 * Passe en revue tout ce qui doit être vrai pour qu'une vraie commande, payée par
 * un vrai client, arrive à destination. Chaque point vient d'un problème réel
 * rencontré pendant le développement, pas d'une liste générique.
 *
 *     pnpm preflight
 *
 * Les BLOQUANTS empêchent d'encaisser. Les AVERTISSEMENTS dégradent l'expérience
 * ou la sécurité sans empêcher une vente.
 */

let blockers = 0;
let warnings = 0;

function ok(label: string, detail = ''): void {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}
function block(label: string, detail: string): void {
  blockers += 1;
  console.error(`  ✖ BLOQUANT  ${label} — ${detail}`);
}
function warn(label: string, detail: string): void {
  warnings += 1;
  console.warn(`  ⚠ ${label} — ${detail}`);
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** Cadence attendue en production : toutes les 10 minutes. */
const CADENCE_ATTENDUE = '*/10 * * * *';

function verifierCadenceDesTaches(): void {
  const chemin = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/web/vercel.json');

  let cadence: string | undefined;
  try {
    const config = JSON.parse(readFileSync(chemin, 'utf8')) as {
      crons?: { path?: string; schedule?: string }[];
    };
    cadence = config.crons?.find((c) => c.path === '/api/v1/taches')?.schedule;
  } catch {
    block('Tâches planifiées', `vercel.json illisible (${chemin})`);
    return;
  }

  if (!cadence) {
    block(
      'Tâches planifiées',
      'aucune tâche déclarée dans vercel.json — les stocks réservés ne seraient ' +
        'jamais libérés et les paiements non notifiés jamais rattrapés',
    );
  } else if (cadence !== CADENCE_ATTENDUE) {
    block(
      'Tâches planifiées',
      `cadence « ${cadence} » au lieu de « ${CADENCE_ATTENDUE} » — abaissée pour le ` +
        'plan Hobby de Vercel. À rétablir dans vercel.json APRÈS le passage en Pro : ' +
        'sinon un paiement dont la notification se perd attend jusqu’à 24 h',
    );
  } else {
    ok('Tâches planifiées — toutes les 10 minutes');
  }
}

async function checkEnvironment(): Promise<void> {
  console.log('\nConfiguration :');

  const siteUrl = env('NEXT_PUBLIC_SITE_URL');
  if (!siteUrl) {
    block('NEXT_PUBLIC_SITE_URL', 'absente — les retours de paiement ne fonctionneront pas');
  } else if (siteUrl.includes('localhost')) {
    block('NEXT_PUBLIC_SITE_URL', `vaut « ${siteUrl} » — inutilisable en production`);
  } else if (!siteUrl.startsWith('https://')) {
    block('NEXT_PUBLIC_SITE_URL', 'doit être en HTTPS');
  } else {
    ok('URL publique', siteUrl);
  }

  const authSecret = env('AUTH_SECRET');
  if (authSecret.length < 32) {
    block('AUTH_SECRET', 'absent ou trop court — générer avec `openssl rand -base64 32`');
  } else {
    ok('Secret de session', `${authSecret.length} caractères`);
  }

  const dbUrl = env('DATABASE_URL');
  const directUrl = env('DIRECT_URL');
  if (!dbUrl || !directUrl) {
    block('DATABASE_URL / DIRECT_URL', 'les deux sont requises');
  } else if (dbUrl === directUrl) {
    warn(
      'DATABASE_URL et DIRECT_URL identiques',
      'les migrations doivent passer en connexion directe, sans pooler',
    );
  } else if (!dbUrl.includes('-pooler')) {
    warn('DATABASE_URL', 'ne semble pas passer par le pooler — risque de saturation');
  } else {
    ok('Connexions base', 'pooler et direct distincts');
  }

  if (!env('CRON_SECRET')) {
    block(
      'CRON_SECRET',
      'absent — les tâches planifiées seront refusées, le stock expiré ne sera jamais libéré',
    );
  } else {
    ok('Secret des tâches planifiées');
  }

  if (env('SEED_DEMO_DATA') === 'true') {
    block('SEED_DEMO_DATA', 'vaut « true » — des produits de démonstration seraient créés');
  } else {
    ok('Données de démonstration désactivées');
  }

  /**
   * Fréquence de la tâche planifiée — BLOQUANT.
   *
   * Le plan Hobby de Vercel n'autorise qu'une exécution par jour ; la cadence a donc
   * été abaissée pour permettre un premier déploiement. Il FAUT la rétablir avant
   * d'ouvrir : cette tâche rattrape les paiements dont la notification Pesapal s'est
   * perdue. Une fois par jour, un client ayant payé attendrait jusqu'à 24 heures que
   * sa commande passe en « payée » — et il écrira bien avant.
   *
   * Ce contrôle existe parce qu'un réglage « provisoire » qui n'est vérifié nulle
   * part devient définitif. `vercel.json` étant du JSON strict, il ne peut pas
   * porter de commentaire d'avertissement : la garde vit donc ici.
   */
  verifierCadenceDesTaches();

  /**
   * Coordonnées de la boutique — BLOQUANT, et non un simple avertissement.
   * Une boutique dont les clients ne peuvent joindre personne ne doit pas ouvrir :
   * la question sans réponse devient un litige, puis un impayé.
   */
  const coordonneesFictives = coordonneesIncompletes();
  if (coordonneesFictives.length > 0) {
    block(
      'Coordonnées de la boutique',
      `encore fictives (${coordonneesFictives.join(', ')}) — ` +
        'les clients ne pourraient joindre personne. À corriger dans ' +
        'packages/shared/src/config/boutique.ts',
    );
  } else {
    ok(`Coordonnées — ${BOUTIQUE.whatsapp} · ${BOUTIQUE.email}`);
  }

  if (!env('NEXT_PUBLIC_IMAGE_HOST')) {
    warn('NEXT_PUBLIC_IMAGE_HOST', 'absent — aucune image distante ne pourra être affichée');
  } else {
    ok('Hôte des images', env('NEXT_PUBLIC_IMAGE_HOST'));
  }

  if (!env('RESEND_API_KEY')) {
    warn(
      'RESEND_API_KEY',
      'absente — aucun e-mail ne partira, y compris les liens de réinitialisation',
    );
  } else {
    ok('Envoi d’e-mails configuré');
  }
}

async function checkPesapal(): Promise<void> {
  console.log('\nPaiement :');

  const key = env('PESAPAL_CONSUMER_KEY');
  const secret = env('PESAPAL_CONSUMER_SECRET');
  const environment = env('PESAPAL_ENVIRONMENT');

  if (!key || !secret) {
    block('Identifiants Pesapal', 'absents — la boutique ne peut pas encaisser');
    return;
  }

  if (environment !== 'production') {
    block(
      'PESAPAL_ENVIRONMENT',
      `vaut « ${environment || 'sandbox'} » — les paiements seraient simulés`,
    );
  }

  if (!env('PESAPAL_IPN_ID')) {
    block('PESAPAL_IPN_ID', 'absent — aucune commande ne peut être soumise au paiement');
  }

  try {
    await getAccessToken(readPesapalConfig());
    ok('Connexion Pesapal', `jeton obtenu (${environment || 'sandbox'})`);
  } catch (error) {
    block(
      'Connexion Pesapal',
      error instanceof Error ? error.message : 'échec de l’authentification',
    );
  }
}

async function checkDatabase(): Promise<void> {
  console.log('\nBase de données :');

  try {
    await prisma.$queryRaw`SELECT 1`;
    ok('Connexion');
  } catch {
    block('Connexion base', 'injoignable');
    return;
  }

  // Objets ajoutés à la main dans la migration : leur absence casse la recherche
  // et la numérotation des commandes sans que rien ne l'annonce.
  const [sequence] = await prisma.$queryRaw<{ n: string }[]>`
    SELECT beralshopp_next_order_number() AS n
  `.catch(() => [] as { n: string }[]);
  if (sequence?.n) ok('Numérotation des commandes', sequence.n);
  else block('Numérotation des commandes', 'la séquence PostgreSQL est absente');

  const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
  if (admins === 0) {
    block('Compte administrateur', 'aucun — personne ne pourra gérer les commandes');
  } else {
    ok('Comptes administrateurs', String(admins));
  }

  const products = await prisma.product.count({
    where: { status: 'ACTIVE', publishedAt: { not: null } },
  });
  if (products === 0) block('Catalogue', 'aucun produit publié');
  else ok('Produits publiés', String(products));

  const withImages = await prisma.product.count({
    where: { status: 'ACTIVE', images: { some: {} } },
  });
  if (withImages === 0 && products > 0) {
    warn('Photos produits', `aucun des ${products} produits n’a de photo`);
  } else if (withImages < products) {
    warn('Photos produits', `${products - withImages} produit(s) sans photo`);
  } else if (products > 0) {
    ok('Photos produits', 'tous les produits en ont');
  }

  const shipping = await prisma.shippingRate.count({ where: { isActive: true } });
  if (shipping === 0) block('Livraison', 'aucun tarif actif — les commandes échoueront');
  else ok('Tarifs de livraison', String(shipping));

  const openCountries = await prisma.country.count({ where: { isSellingEnabled: true } });
  if (openCountries === 0) block('Pays de vente', 'aucun pays ouvert à la vente');
  else ok('Pays ouverts à la vente', String(openCountries));

  // Une dérive de stock immobilise des articles vendables sans commande en face.
  const drifted = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM product_variants v
    WHERE v."reservedQuantity" <> COALESCE((
      SELECT sum(oi.quantity) FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE oi."variantId" = v.id AND o.status = 'PENDING_PAYMENT'
    ), 0)
  `;
  const driftCount = Number(drifted[0]?.n ?? 0);
  if (driftCount > 0) {
    warn('Réservations de stock', `${driftCount} variante(s) en dérive — lancer pnpm db:reconcile`);
  } else {
    ok('Réservations de stock', 'cohérentes');
  }
}

async function main(): Promise<void> {
  console.log('\n▶ Contrôle avant mise en ligne — Beralshopp');

  await checkEnvironment();
  await checkPesapal();
  await checkDatabase();

  console.log('');
  if (blockers > 0) {
    console.error(
      `✖ ${blockers} point(s) BLOQUANT(S) et ${warnings} avertissement(s).\n` +
        '  La boutique ne doit pas être ouverte en l’état.\n',
    );
    process.exitCode = 1;
  } else if (warnings > 0) {
    console.warn(
      `⚠ Aucun bloquant, mais ${warnings} avertissement(s) à examiner avant d’ouvrir.\n`,
    );
  } else {
    console.log('✔ Tous les contrôles passent. La boutique peut être ouverte.\n');
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
