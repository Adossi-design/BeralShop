// ⚠️ Doit rester le tout premier import : charge l'environnement depuis la racine
// du dépôt avant que la configuration ne lise process.env.
import './src/load-env.ts';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    /**
     * DIRECT_URL : connexion directe, sans pooler. Les migrations ne doivent JAMAIS
     * passer par un pooler transactionnel (PgBouncer côté Neon), qui casse les
     * instructions DDL. L'application, elle, utilise DATABASE_URL (pooler).
     */
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
});
