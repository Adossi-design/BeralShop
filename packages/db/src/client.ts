import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.ts';
import { rejouerSiReveil } from './retry.ts';

/**
 * Client Prisma partagé.
 *
 * En développement, Next.js recharge les modules à chaque modification. Sans singleton,
 * chaque rechargement ouvrirait un nouveau pool de connexions et saturerait la base en
 * quelques minutes. On mémorise donc l'instance sur `globalThis`.
 *
 * En production, le module n'est évalué qu'une fois : le garde est sans effet.
 */

declare global {
  // eslint-disable-next-line no-var
  var __beralshoppPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL n'est pas défini. Copier .env.example vers .env.local et renseigner " +
        'la chaîne de connexion PostgreSQL.',
    );
  }

  /**
   * DATABASE_URL pointe vers le pooler (PgBouncer côté Neon) : c'est ce que
   * l'application utilise. Les migrations, elles, passent par DIRECT_URL — voir
   * prisma.config.ts. Confondre les deux casse les migrations de façon peu lisible.
   */
  const adapter = new PrismaPg({
    connectionString,
    /**
     * ⚠️ PLAFOND DE CONNEXIONS PAR PROCESSUS.
     *
     * Sans lui, le pool par défaut ouvre jusqu'à 10 connexions. Multiplié par les
     * processus parallèles du build Next (onze sur cette machine), cela dépassait la
     * capacité de la base et faisait échouer le build sur « Connection terminated
     * unexpectedly ».
     *
     * Le même raisonnement vaut en production sans état : chaque instance ne doit
     * réclamer que ce dont elle a besoin. Trois connexions suffisent largement à une
     * page qui exécute quelques requêtes en parallèle.
     */
    max: 3,
    /** Une connexion inutilisée est rendue vite : les instances sont éphémères. */
    idleTimeoutMillis: 10_000,
    /**
     * Délai d'obtention d'une connexion.
     *
     * 30 secondes et non 15 : Neon met son calcul en veille après quelques minutes
     * d'inactivité, et le réveil prend plusieurs secondes. Avec plusieurs processus
     * qui redémarrent en même temps — typiquement un build — un délai trop court
     * provoque des « Connection terminated due to connection timeout » alors que la
     * base est parfaitement saine.
     */
    connectionTimeoutMillis: 30_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * Rejoue les requêtes tombées pendant le réveil de Neon.
 *
 * Les règles — et surtout ce qu'on refuse de rejouer — sont dans `retry.ts`,
 * avec leurs tests. C'est du code qui décide du risque de commande en double :
 * il ne doit pas vivre au milieu de la configuration du pool.
 */
function withColdStartRetry(client: PrismaClient): PrismaClient {
  return client.$extends({
    name: 'reveil-neon',
    query: {
      $allOperations: ({ args, query }) => rejouerSiReveil(() => query(args)),
    },
  }) as unknown as PrismaClient;
}

export const prisma: PrismaClient =
  globalThis.__beralshoppPrisma ?? withColdStartRetry(createClient());

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__beralshoppPrisma = prisma;
}
