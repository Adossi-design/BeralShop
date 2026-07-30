import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

/**
 * Charge les variables d'environnement depuis la racine du dépôt.
 *
 * Module à IMPORTER EN PREMIER par tout script exécuté hors de Next.js (amorçage,
 * scripts de maintenance, tâches planifiées). Next.js et Vercel chargent l'environnement
 * eux-mêmes : ce module n'a alors aucun effet, `dotenv` n'écrasant jamais une variable
 * déjà définie.
 *
 * Une seule source de vérité : le `.env` à la racine. Un `.env` par paquet finit
 * toujours par produire deux bases de données divergentes.
 *
 * `.env.local` est chargé en premier et l'emporte — c'est le fichier de la machine du
 * développeur, jamais commité.
 */
const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, '../../..');

config({ path: resolve(repoRoot, '.env.local'), quiet: true });
config({ path: resolve(repoRoot, '.env'), quiet: true });
