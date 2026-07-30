import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.ts';

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
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient = globalThis.__beralshoppPrisma ?? createClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__beralshoppPrisma = prisma;
}
