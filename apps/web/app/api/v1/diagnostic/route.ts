import { NextResponse } from 'next/server';

import { prisma } from '@beralshopp/db';
import { BOUTIQUE } from '@beralshopp/shared';

import { isAuthorizedBySecret } from '@/lib/secret-auth';

/**
 * État de configuration du déploiement RÉEL.
 *
 * POURQUOI CETTE ROUTE EXISTE
 * `pnpm preflight` lit l'environnement de la machine sur laquelle il tourne — donc
 * celui du développeur, jamais celui de la production. Il annonçait des blocages
 * inexistants en ligne, et inversement il ne pouvait pas voir une variable oubliée
 * sur Vercel. On ne peut pas vérifier une mise en production depuis un poste de
 * travail : il faut interroger le serveur lui-même.
 *
 * ⚠️ AUCUNE VALEUR SECRÈTE N'EST RENVOYÉE — uniquement des présences, des longueurs
 * et des valeurs non sensibles (nom d'environnement, URL publique). Une route de
 * diagnostic qui divulgue ce qu'elle contrôle est une porte d'entrée.
 *
 * Protégée par CRON_SECRET, comme les tâches planifiées :
 *
 *     curl -H "Authorization: Bearer <CRON_SECRET>" https://<site>/api/v1/diagnostic
 */

export const dynamic = 'force-dynamic';

function estDefini(nom: string): boolean {
  return (process.env[nom] ?? '').trim().length > 0;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedBySecret(request)) {
    return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  }

  const siteUrl = (process.env['NEXT_PUBLIC_SITE_URL'] ?? '').trim();
  const pesapalEnv = (process.env['PESAPAL_ENVIRONMENT'] ?? '').trim();

  const problemes: string[] = [];
  if (!siteUrl.startsWith('https://')) problemes.push('NEXT_PUBLIC_SITE_URL absente ou non HTTPS');
  if (pesapalEnv !== 'production')
    problemes.push(
      `PESAPAL_ENVIRONMENT vaut « ${pesapalEnv || 'vide'} » au lieu de « production »`,
    );
  if (!estDefini('PESAPAL_IPN_ID'))
    problemes.push('PESAPAL_IPN_ID absent — aucune commande ne peut être payée');
  if (!estDefini('PESAPAL_CONSUMER_KEY') || !estDefini('PESAPAL_CONSUMER_SECRET')) {
    problemes.push('Identifiants Pesapal absents');
  }
  if (!estDefini('AUTH_SECRET'))
    problemes.push('AUTH_SECRET absent — les sessions ne peuvent être signées');
  if (!estDefini('CRON_SECRET')) problemes.push('CRON_SECRET absent');
  if (process.env['SEED_DEMO_DATA'] === 'true')
    problemes.push('SEED_DEMO_DATA activé en production');

  let produitsPublies: number | null = null;
  let baseJoignable = true;
  try {
    produitsPublies = await prisma.product.count({
      where: { status: 'ACTIVE', publishedAt: { not: null } },
    });
  } catch {
    baseJoignable = false;
    problemes.push('Base de données injoignable');
  }

  return NextResponse.json(
    {
      pret: problemes.length === 0,
      problemes,
      site: { url: siteUrl || null, region: process.env['VERCEL_REGION'] ?? null },
      paiement: {
        environnement: pesapalEnv || null,
        identifiants: estDefini('PESAPAL_CONSUMER_KEY') && estDefini('PESAPAL_CONSUMER_SECRET'),
        ipnEnregistre: estDefini('PESAPAL_IPN_ID'),
      },
      securite: {
        authSecret: estDefini('AUTH_SECRET'),
        cronSecret: estDefini('CRON_SECRET'),
      },
      base: { joignable: baseJoignable, produitsPublies },
      boutique: { telephone: BOUTIQUE.telephone, email: BOUTIQUE.email },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
