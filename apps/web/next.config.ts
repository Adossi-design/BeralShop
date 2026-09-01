import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Next lit ses fichiers `.env` dans le dossier de l'application. Or Beralshopp n'a
 * qu'UN seul fichier d'environnement, à la racine du dépôt, partagé avec les
 * migrations et les scripts. Le dupliquer dans apps/web multiplierait les endroits
 * où un secret peut traîner et provoquerait tôt ou tard deux bases divergentes.
 *
 * On le charge donc explicitement ici. Ce fichier est évalué au démarrage de `next
 * dev` comme de `next build`, et les processus de build en héritent.
 *
 * En production (Vercel), les variables viennent de la plateforme : `dotenv`
 * n'écrasant jamais une variable déjà définie, ce chargement est alors sans effet.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv({ path: resolve(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: resolve(repoRoot, '.env'), quiet: true });

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 * Référence : docs/06-securite-propriete.md
 *
 * La Content-Security-Policy n'est volontairement pas ici : elle sera posée par le
 * middleware avec un `nonce` régénéré à chaque requête, ce qu'un en-tête statique
 * ne permet pas.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
];

const imageHost = process.env['NEXT_PUBLIC_IMAGE_HOST'];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Les paquets internes sont livrés en TypeScript source, sans étape de compilation.
   * Next les transpile lui-même : une étape de build en moins à chaque modification,
   * et le typage reste exact entre le site et la future application mobile.
   */
  transpilePackages: ['@beralshopp/shared', '@beralshopp/core', '@beralshopp/db'],

  /**
   * Racine à partir de laquelle Next trace les fichiers à embarquer dans les
   * fonctions serveur.
   *
   * Sans ce réglage, Next prend `apps/web` pour racine et ignore tout ce qui vit
   * au-dessus — dont `packages/db/generated`, le client Prisma. Le site se
   * construit sans erreur, puis échoue à l'exécution sur un module introuvable :
   * la pire des pannes, celle qui ne se voit qu'en production.
   */
  outputFileTracingRoot: resolve(dirname(fileURLToPath(import.meta.url)), '../..'),

  images: {
    /**
     * AVIF en premier : environ 30 % plus léger que le WebP à qualité égale.
     * Sur une connexion 3G, c'est la différence entre une page lente et une page fluide.
     */
    formats: ['image/avif', 'image/webp'],
    /** Tailles calées sur les appareils réellement utilisés, pas sur des écrans de bureau. */
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    /**
     * Domaines externes autorisés pour les images.
     *
     * ⚠️ Next REFUSE toute image dont le domaine n'est pas listé ici — et le
     * refus est silencieux côté visiteur : un carré vide, sans message. Le
     * stockage Blob de Vercel sert les photos téléversées depuis
     * l'administration ; sans cette ligne, elles seraient déposées avec succès
     * puis invisibles sur la boutique.
     */
    remotePatterns: [
      { protocol: 'https' as const, hostname: '*.public.blob.vercel-storage.com' },
      ...(imageHost ? [{ protocol: 'https' as const, hostname: imageHost }] : []),
    ],
  },

  experimental: {
    optimizePackageImports: ['@beralshopp/shared'],

    /**
     * Taille maximale du corps d'une action serveur.
     *
     * NON POSE = 1 Mo, et le defaut ne previent personne. Mesure sur cette
     * boutique : une photo de 4 ko s'ajoutait, une photo de 5,57 Mo ne faisait
     * RIEN — pas d'image, pas de message d'erreur, pas d'erreur reseau. Le
     * proprietaire cliquait « Ajouter les photos » et regardait un ecran qui ne
     * repondait pas.
     *
     * 4 Mo, et pas davantage : Vercel plafonne le corps d'une requete de
     * fonction a 4,5 Mo, ce qui ne se configure pas. Monter ce nombre plus haut
     * ne ferait que deplacer l'echec vers une couche qui, elle, ne renvoie
     * aucun message exploitable.
     */
    serverActions: { bodySizeLimit: '4mb' },
    /**
     * Nombre de processus utilisés pour le pré-rendu.
     *
     * Par défaut Next en lance autant que de cœurs — onze sur cette machine. Chacun
     * ouvrant ses propres connexions à la base, le build saturait la base de données
     * et échouait. Quatre suffisent : le pré-rendu attend surtout la base, pas le
     * processeur.
     */
    cpus: 4,
  },

  /**
   * Le typage bloque le build, en local comme en intégration continue.
   * Ne jamais basculer cette option à `true` : c'est ainsi qu'un bug arrive
   * en production. Le lint est vérifié séparément (`pnpm lint`) et par la CI —
   * Next 16 ne pilote plus ESLint depuis sa configuration.
   */
  typescript: { ignoreBuildErrors: false },

  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
