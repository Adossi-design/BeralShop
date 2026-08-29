import Link from 'next/link';
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react';

import { listBestSellers, listCategoryTree, listNewArrivals, listOnSale } from '@beralshopp/core';

import { CategoryShortcuts } from '@/components/catalog/category-shortcuts';
import { ProductRail } from '@/components/catalog/product-grid';

/**
 * Page d'accueil.
 *
 * Rendue sur le serveur et régénérée toutes les 5 minutes. Les trois requêtes
 * catalogue partent EN PARALLÈLE : les enchaîner ajouterait leurs latences les unes
 * aux autres, ce qui se voit immédiatement sur une connexion lente.
 */
export const revalidate = 300;

const GUARANTEES = [
  { icon: ShieldCheck, label: 'Paiement sécurisé', detail: 'Vérifié côté serveur' },
  { icon: Truck, label: 'Livraison gratuite', detail: 'Partout en Afrique, sous 2 semaines' },
  { icon: PackageCheck, label: 'Commande garantie', detail: 'Remboursement si problème' },
];

function Section({
  title,
  href,
  children,
}: {
  readonly title: string;
  readonly href: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="beral-container py-3">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-content text-base font-bold sm:text-lg">{title}</h2>
        <Link
          href={href}
          className="text-gold-600 hover:text-gold-700 shrink-0 text-sm font-medium"
        >
          Tout voir
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [categories, bestSellers, newArrivals, onSale] = await Promise.all([
    listCategoryTree(),
    listBestSellers(undefined, 10),
    listNewArrivals(undefined, 10),
    listOnSale(undefined, 10),
  ]);

  return (
    <main id="contenu" className="flex-1">
      {/*
        Pas de bannière promotionnelle : il n'y a aucune campagne à y mettre, et
        une bannière décorative ne ferait que repousser les produits.
        Le titre h1 reste, discret, pour l'accessibilité et le référencement.
      */}
      <h1 className="sr-only">Beralshopp — vente en ligne au Rwanda</h1>

      {/* ——— Réassurance ———
          Une seule ligne, même sur téléphone : chaque pixel de hauteur pris ici
          repousse les produits — la vraie raison de la visite — sous la pliure.
          Le détail n'apparaît qu'à partir des écrans moyens. */}
      <section className="border-border bg-surface border-b">
        <div className="beral-container grid grid-cols-3 gap-2 py-2.5">
          {GUARANTEES.map((item) => (
            <div key={item.label} className="flex items-center gap-2 sm:gap-3">
              <item.icon className="text-gold-600 h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
              <div className="min-w-0">
                <p className="text-content text-xs leading-tight font-semibold sm:text-sm">
                  {item.label}
                </p>
                <p className="text-content-muted hidden text-xs md:block">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ——— Accès rapide aux rubriques ———
          Placé avant tout produit, comme dans les applications marchandes : le
          visiteur qui sait ce qu'il cherche part directement, celui qui furète
          continue vers les rails plus bas. */}
      <CategoryShortcuts categories={categories} />

      {/* ——— Rails marchands ——— */}
      {bestSellers.items.length > 0 ? (
        <Section title="Produits populaires" href="/categories">
          <ProductRail products={bestSellers.items} />
        </Section>
      ) : null}

      {onSale.items.length > 0 ? (
        <Section title="Promotions" href="/categories">
          <ProductRail products={onSale.items} />
        </Section>
      ) : null}

      {newArrivals.items.length > 0 ? (
        <Section title="Nouveaux arrivages" href="/categories">
          <ProductRail products={newArrivals.items} />
        </Section>
      ) : null}
    </main>
  );
}
