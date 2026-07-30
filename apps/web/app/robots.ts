import type { MetadataRoute } from 'next';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

/**
 * robots.txt
 *
 * On interdit explicitement l'indexation des espaces privés et des pages sans valeur
 * pour un moteur : panier, tunnel de commande, compte, administration, API, retour
 * de paiement. Les laisser ouverts gaspillerait le budget d'exploration de Google
 * sur des pages qui ne feront jamais venir un client.
 *
 * Le blocage complet en préproduction évite qu'un déploiement de test soit indexé
 * et vienne concurrencer le vrai site.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env['NODE_ENV'] === 'production' && !SITE_URL.includes('localhost');

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/compte',
          '/compte/',
          '/panier',
          '/commande',
          '/commande/',
          '/paiement/retour',
          '/connexion',
          '/inscription',
          '/mot-de-passe',
          '/mot-de-passe-oublie',
          '/recherche',
        ],
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
