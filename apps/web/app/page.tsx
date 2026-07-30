import Link from 'next/link';
import { CreditCard, PackageCheck, Search, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { listBestSellers, listNewArrivals, listOnSale } from '@beralshopp/core';

import { ProductRail } from '@/components/catalog/product-grid';

/**
 * Page d'accueil.
 *
 * Rendue sur le serveur et régénérée toutes les 5 minutes. Les trois requêtes
 * catalogue partent EN PARALLÈLE : les enchaîner ajouterait leurs latences les unes
 * aux autres, ce qui se voit immédiatement sur une connexion lente.
 */
export const revalidate = 300;

const STEPS = [
  {
    icon: Search,
    title: 'Trouvez votre produit',
    text: 'Cherchez par nom, marque ou référence, ou parcourez les catégories.',
  },
  {
    icon: ShoppingBag,
    title: 'Ajoutez au panier',
    text: 'Vérifiez la quantité et les options. La livraison est gratuite.',
  },
  {
    icon: CreditCard,
    title: 'Payez en toute sécurité',
    text: 'MTN MoMo, Airtel Money, Visa ou Mastercard. Paiement protégé.',
  },
  {
    icon: Truck,
    title: 'Suivez votre colis',
    text: 'Vous êtes prévenu à chaque étape, jusqu’à la livraison.',
  },
];

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
    <section className="beral-container py-4">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-content text-lg font-bold sm:text-xl">{title}</h2>
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
  const [bestSellers, newArrivals, onSale] = await Promise.all([
    listBestSellers(undefined, 10),
    listNewArrivals(undefined, 10),
    listOnSale(undefined, 10),
  ]);

  return (
    <main id="contenu" className="flex-1">
      {/*
        Choix du propriétaire (30 juillet 2026) : pas de bannière d'accueil ni de
        grille de catégories ici. La page va droit aux produits — le titre h1
        reste, pour l'accessibilité et le référencement, mais discret.
        La navigation par catégorie vit dans l'en-tête et sur /categories.
      */}
      <h1 className="sr-only">Beralshopp — vente en ligne au Rwanda</h1>

      {/* ——— Réassurance ———
          Une seule ligne, même sur téléphone : chaque pixel de hauteur pris ici
          repousse les produits — la vraie raison de la visite — sous la pliure.
          Le détail n'apparaît qu'à partir des écrans moyens. */}
      <section className="border-border bg-surface border-b">
        <div className="beral-container grid grid-cols-3 gap-2 py-3 sm:py-4">
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

      {/* ——— Comment commander ——— */}
      <section className="bg-surface-muted mt-6">
        <div className="beral-container py-12">
          <h2 className="text-content text-center text-xl font-bold sm:text-2xl">
            Comment commander ?
          </h2>
          <p className="text-content-muted mx-auto mt-2 max-w-xl text-center text-sm">
            Quatre étapes simples, de la recherche à la livraison.
          </p>

          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="border-border bg-surface shadow-card rounded-card border p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-ink-900 flex h-10 w-10 items-center justify-center rounded-full font-bold text-white">
                    {index + 1}
                  </span>
                  <step.icon className="text-gold-600 h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-content mt-4 font-semibold">{step.title}</h3>
                <p className="text-content-muted mt-1.5 text-sm">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
