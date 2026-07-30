import type { NextConfig } from 'next';

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
  transpilePackages: ['@beralshop/shared', '@beralshop/db'],

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
    remotePatterns: imageHost ? [{ protocol: 'https' as const, hostname: imageHost }] : [],
  },

  experimental: {
    optimizePackageImports: ['@beralshop/shared'],
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
