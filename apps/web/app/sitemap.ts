import type { MetadataRoute } from 'next';

import { prisma } from '@beralshopp/db';

const SITE_URL = (process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

/**
 * Plan du site.
 *
 * Contient uniquement les pages qui ont une valeur pour un moteur de recherche :
 * accueil, pages d'information, catégories actives et fiches produits publiées.
 * Panier, compte et administration en sont exclus — ils sont déjà interdits dans
 * robots.txt, mais un plan de site cohérent évite les avertissements dans la Search
 * Console.
 *
 * Régénéré toutes les heures : inutile de recalculer à chaque passage d'un robot,
 * et une heure de fraîcheur suffit largement pour un catalogue.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      // Plafond volontaire : au-delà, il faudra découper en plusieurs plans de site,
      // la limite étant de 50 000 URL par fichier.
      take: 40_000,
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/promotions`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/nouveautes`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/meilleures-ventes`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/livraison`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/paiement`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/suivi`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/conditions`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/retours`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: `${SITE_URL}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/produits/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      // Les fiches produits sont les pages qui doivent ressortir : ce sont elles
      // qui convertissent un visiteur venu de Google.
      priority: 0.9,
    })),
  ];
}
