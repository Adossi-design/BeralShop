import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RotateCcw, ShieldCheck, Truck } from 'lucide-react';

import { listBestSellers, listSimilarProducts } from '@beralshopp/core';
import { formatMoney, toMajor } from '@beralshopp/shared';

import { getProduct } from '@/lib/request-cache';
import { Breadcrumb } from '@/components/catalog/breadcrumb';
import { ProductGallery } from '@/components/catalog/product-gallery';
import { ProductRail } from '@/components/catalog/product-grid';
import { StarRating } from '@/components/catalog/star-rating';
import { PriceTiers } from '@/components/catalog/price-tiers';
import { SelectionVariante } from '@/components/catalog/selection-variante';
import { VariantPicker } from '@/components/catalog/variant-picker';

/**
 * Fiche produit.
 *
 * Page la plus consultée d'une boutique et la plus déterminante pour la vente.
 * Rendue sur le serveur et régénérée toutes les 5 minutes : un produit vu par
 * 10 000 personnes ne déclenche pas 10 000 requêtes en base.
 */
export const revalidate = 300;

/**
 * Pré-rend les fiches les plus vendues au moment du build.
 *
 * Compromis assumé : pré-rendre TOUT le catalogue rallongerait le build
 * proportionnellement au nombre de produits — insoutenable à plusieurs milliers de
 * références. Pré-rendre les 50 meilleures ventes couvre l'essentiel du trafic, et
 * les autres fiches sont rendues à la première visite puis mises en cache.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { items } = await listBestSellers(undefined, 50);
    return items.map((product) => ({ slug: product.slug }));
  } catch {
    // Base injoignable au moment du build : on n'en pré-rend aucune plutôt que de
    // faire échouer le déploiement. Les fiches seront servies à la demande.
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: 'Produit introuvable' };

  const description =
    product.description?.slice(0, 155) ??
    `${product.name} disponible sur Beralshopp. Paiement Mobile Money ou carte bancaire.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/produits/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      ...(product.image ? { images: [product.image.url] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const similar = await listSimilarProducts(product);
  const specifications = Object.entries(product.specifications);

  /**
   * Données structurées Schema.org : c'est ce qui permet à Google d'afficher le prix
   * et la disponibilité directement dans ses résultats. Sur un marché concurrentiel,
   * c'est un levier d'acquisition gratuit.
   */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    ...(product.brandName ? { brand: { '@type': 'Brand', name: product.brandName } } : {}),
    ...(product.description ? { description: product.description } : {}),
    offers: {
      '@type': 'Offer',
      price: toMajor(product.price.amount),
      priceCurrency: product.price.amount.currency,
      availability: product.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <script
        type="application/ld+json"
        // Contenu généré par nous à partir de la base, jamais une saisie libre du client.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Breadcrumb
        items={[
          { href: '/categories', label: 'Catégories' },
          ...product.categoryPath.map((node) => ({
            href: `/categories/${node.slug}`,
            label: node.name,
          })),
          { href: `/produits/${product.slug}`, label: product.name },
        ]}
      />

      {/* Le fournisseur enveloppe la galerie ET le sélecteur : ils sont frères
          dans la mise en page, et seul un contexte posé au-dessus des deux peut
          les accorder. La valeur initiale reprend la règle du sélecteur — la
          première couleur DISPONIBLE — pour que la galerie parte sur la même. */}
      <SelectionVariante
        initial={(product.variants.find((v) => v.isAvailable) ?? product.variants[0])?.id ?? ''}
      >
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* ——— Galerie ———
            `min-w-0` EST INDISPENSABLE. Une case de grille refuse par défaut de
            devenir plus étroite que son contenu, et le contenu est ici une
            rangée de onze photos : la colonne se calait sur 784 px quelle que
            soit la taille de l'écran, et la page débordait de 480 px à
            l'horizontale sur un téléphone de 320 px.

            `max-w-[28rem]` tient la deuxième moitié du problème : une image
            carrée occupant toute la largeur d'une tablette fait 720 px de haut,
            et le bouton « Ajouter au panier » tombait sous la ligne de
            flottaison.

            Cette borne s'écrivait auparavant `min(28rem,70svh)`, pour rétrécir
            aussi sur un écran bas. Une valeur composée est fragile : si UN de
            ses termes n'est pas compris, le navigateur jette la déclaration
            ENTIÈRE et il ne reste plus aucune borne — c'est ce qui se produisait
            en Safari, où `max-width` valait `none`. Le cas de l'écran bas est
            désormais traité par une requête média sur la hauteur, dans
            globals.css : une syntaxe qu'aucun navigateur ne peut mal lire. */}
          <div className="mx-auto w-full max-w-[28rem] min-w-0 lg:mx-0 lg:max-w-none">
            <ProductGallery images={product.images} name={product.name} />
          </div>

          {/* ——— Informations et achat ——— */}
          <div className="flex flex-col gap-4">
            <div>
              {product.brandName ? (
                <p className="text-content-muted text-xs tracking-wide uppercase">
                  {product.brandName}
                </p>
              ) : null}
              <h1 className="text-content mt-1 text-xl font-bold sm:text-2xl">{product.name}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StarRating value={product.ratingAvg} count={product.ratingCount} size="md" />
                {product.salesCount > 0 ? (
                  <span className="text-content-muted text-xs">{product.salesCount} vendus</span>
                ) : null}
              </div>
            </div>

            {/* La grille passe AVANT le choix de variante : elle repond a la
              question du prix, que le client se pose avant celle de la couleur. */}
            <PriceTiers tiers={product.priceTiers} />

            <VariantPicker variants={product.variants} optionNames={product.optionNames} />

            {/* ——— Réassurance ——— */}
            <ul className="border-border grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
              <li className="flex items-start gap-2">
                <ShieldCheck className="text-gold-600 mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span className="text-content-muted">
                  Paiement sécurisé
                  <br />
                  MoMo, Airtel, carte
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="text-gold-600 mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span className="text-content-muted">
                  Livraison gratuite
                  <br />
                  partout en Afrique
                </span>
              </li>
              <li className="flex items-start gap-2">
                <RotateCcw className="text-gold-600 mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span className="text-content-muted">
                  Remboursement
                  <br />
                  si non conforme
                </span>
              </li>
            </ul>
          </div>
        </div>
      </SelectionVariante>

      {/* ——— Description ——— */}
      {product.description ? (
        <section className="mt-12">
          <h2 className="text-content text-lg font-bold">Description</h2>
          <p className="text-content-muted mt-3 max-w-3xl text-sm leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </section>
      ) : null}

      {/* ——— Caractéristiques ——— */}
      {specifications.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-content text-lg font-bold">Caractéristiques</h2>
          <div className="border-border rounded-card mt-3 max-w-3xl overflow-hidden border">
            <table className="w-full text-sm">
              <tbody>
                {specifications.map(([label, value], index) => (
                  <tr
                    key={label}
                    className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-muted/60'}
                  >
                    <th
                      scope="row"
                      className="text-content-muted w-2/5 px-4 py-2.5 text-start font-medium"
                    >
                      {label}
                    </th>
                    <td className="text-content px-4 py-2.5">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ——— Avis (lot V2) ——— */}
      <section className="mt-10">
        <h2 className="text-content text-lg font-bold">Avis clients</h2>
        <div className="border-border bg-surface-muted/50 rounded-card mt-3 max-w-3xl border border-dashed px-6 py-8 text-center">
          <p className="text-content-muted text-sm">
            {product.ratingCount > 0
              ? `Ce produit est noté ${product.ratingAvg.toFixed(1)} sur 5 par ${product.ratingCount} clients.`
              : 'Aucun avis pour le moment.'}
          </p>
          <p className="text-content-muted/80 mt-1 text-xs">
            Les avis détaillés seront activés en V2. Seuls les clients ayant reçu leur commande
            pourront en publier.
          </p>
        </div>
      </section>

      {/* ——— Produits similaires ——— */}
      {similar.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-content mb-4 text-lg font-bold">Produits similaires</h2>
          <ProductRail products={similar} />
        </section>
      ) : null}

      {/* Le prix formaté sert aussi de repli textuel pour les moteurs qui ignorent le JSON-LD. */}
      <p className="sr-only">Prix : {formatMoney(product.price.amount, 'fr')}</p>
    </main>
  );
}
