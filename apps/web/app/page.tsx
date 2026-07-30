import Link from 'next/link';
import { CreditCard, PackageCheck, Search, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/**
 * Page d'accueil — structure.
 *
 * Les sections marchandes (produits populaires, nouveautés, promotions) sont en
 * place mais vides : elles seront alimentées depuis la base au lot 1, une fois le
 * catalogue créé. Le squelette existe dès maintenant pour que la mise en page, la
 * performance et le référencement soient validés avant d'y injecter des données.
 */

const CATEGORIES = [
  { slug: 'electronique', name: 'Électronique' },
  { slug: 'telephonie', name: 'Téléphones' },
  { slug: 'informatique', name: 'Informatique' },
  { slug: 'mode', name: 'Mode' },
  { slug: 'maison', name: 'Maison' },
  { slug: 'beaute', name: 'Beauté' },
  { slug: 'sport', name: 'Sport' },
  { slug: 'bebe', name: 'Bébé' },
];

const STEPS = [
  {
    icon: Search,
    title: 'Trouvez votre produit',
    text: 'Cherchez par nom, marque ou référence, ou parcourez les catégories.',
  },
  {
    icon: ShoppingBag,
    title: 'Ajoutez au panier',
    text: 'Vérifiez la quantité, les options et les frais de livraison.',
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
  { icon: Truck, label: 'Livraison suivie', detail: 'Rwanda, 1 à 6 jours' },
  { icon: PackageCheck, label: 'Commande garantie', detail: 'Remboursement si problème' },
];

function SectionShell({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="beral-container py-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-content text-lg font-bold sm:text-xl">{title}</h2>
        <Link
          href={href}
          className="text-brand-600 hover:text-brand-700 shrink-0 text-sm font-medium"
        >
          Tout voir
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyRail({ note }: { note: string }) {
  return (
    <div className="rounded-card border-border bg-surface-muted/50 border border-dashed px-6 py-10 text-center">
      <p className="text-content-muted text-sm">{note}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main id="contenu" className="flex-1">
        {/* ——— Bannière ——— */}
        <section className="from-brand-700 via-brand-600 to-brand-800 bg-gradient-to-br">
          <div className="beral-container py-12 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-accent-300 text-sm font-semibold tracking-wide uppercase">
                Bienvenue sur Beralshop
              </p>
              <h1 className="mt-3 text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl">
                Tout ce qu’il vous faut, livré chez vous
              </h1>
              <p className="text-brand-50 mt-4 text-base sm:text-lg">
                Électronique, mode, maison et bien plus. Payez par Mobile Money ou par carte, en
                toute sécurité.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/categories"
                  className="rounded-control bg-accent-400 text-accent-900 hover:bg-accent-300 px-6 py-3 font-semibold transition-colors"
                >
                  Découvrir les produits
                </Link>
                <Link
                  href="/comment-commander"
                  className="rounded-control border border-white/30 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Comment commander ?
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ——— Réassurance ——— */}
        <section className="border-border bg-surface border-b">
          <div className="beral-container grid grid-cols-1 gap-4 py-5 sm:grid-cols-3">
            {GUARANTEES.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="text-brand-600 h-6 w-6 shrink-0" aria-hidden />
                <div>
                  <p className="text-content text-sm font-semibold">{item.label}</p>
                  <p className="text-content-muted text-xs">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ——— Catégories ——— */}
        <section className="beral-container py-8">
          <h2 className="text-content mb-4 text-lg font-bold sm:text-xl">
            Parcourir par catégorie
          </h2>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="rounded-card border-border bg-surface shadow-card hover:shadow-raised flex h-full flex-col items-center gap-2 border p-3 text-center transition-shadow"
                >
                  <span className="bg-brand-50 text-brand-600 flex h-11 w-11 items-center justify-center rounded-full">
                    <ShoppingBag className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-content text-xs leading-tight font-medium">
                    {category.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ——— Rails marchands (alimentés au lot 1) ——— */}
        <SectionShell title="Produits populaires" href="/meilleures-ventes">
          <EmptyRail note="Les produits les plus vendus apparaîtront ici dès la mise en ligne du catalogue." />
        </SectionShell>

        <SectionShell title="Nouveaux arrivages" href="/nouveautes">
          <EmptyRail note="Les derniers produits ajoutés apparaîtront ici." />
        </SectionShell>

        <SectionShell title="Promotions" href="/promotions">
          <EmptyRail note="Les produits en promotion apparaîtront ici, avec leur ancien prix barré." />
        </SectionShell>

        {/* ——— Comment commander ——— */}
        <section className="bg-surface-muted">
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
                  className="rounded-card border-border bg-surface shadow-card border p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-600 flex h-10 w-10 items-center justify-center rounded-full font-bold text-white">
                      {index + 1}
                    </span>
                    <step.icon className="text-brand-600 h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-content mt-4 font-semibold">{step.title}</h3>
                  <p className="text-content-muted mt-1.5 text-sm">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
