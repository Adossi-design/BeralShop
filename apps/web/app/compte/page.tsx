import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  CreditCard,
  DatabaseZap,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserPen,
} from 'lucide-react';

import { compterMesCommandes, listBestSellers } from '@beralshopp/core';
import { BOUTIQUE } from '@beralshopp/shared';

import { ProductRail } from '@/components/catalog/product-grid';
import { LegalLinks } from '@/components/legal-links';
import { logoutAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mon compte',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Espace client — page d'accueil.
 *
 * Reprend le motif des grandes places de marché : un bandeau d'identité, les
 * étapes de commande chiffrées, puis une liste de rubriques. Sur téléphone,
 * cette page EST la navigation du compte ; les sous-pages y reviennent par une
 * flèche. Le menu latéral ne réapparaît qu'à partir de 1024 px, où il y a la
 * place de le montrer en permanence.
 *
 * CE QUE LA RÉFÉRENCE MONTRE ET QUE JE N'AI PAS REPRIS, faute d'exister :
 * liste de souhaits, boutiques suivies, bons de réduction, portefeuille,
 * parrainage, niveau de fidélité. Poser ces cases vides ou inventer des
 * chiffres donnerait un compte qui promet des services que la boutique ne rend
 * pas — et il faudrait ensuite les retirer devant un client déçu.
 *
 * « Vus récemment » manque aussi, et pour une raison différente : il faudrait
 * enregistrer chaque fiche consultée par chaque visiteur. La règle posée pour
 * ce site interdit de collecter plus que ce qui a été annoncé.
 */

const RUBRIQUES = [
  {
    href: '/compte/adresses',
    icon: MapPin,
    titre: 'Mes adresses',
    aide: 'Adresses de livraison enregistrées',
  },
  {
    href: '/compte/securite',
    icon: ShieldCheck,
    titre: 'Sécurité',
    aide: 'Mot de passe et connexions actives',
  },
  /* Une seule entrée pour les informations : la référence en aligne trois
     (profil, données, confidentialité) parce qu'elles y mènent à trois écrans
     différents. Ici elles mènent au même, et trois portes vers une seule pièce
     ne font qu'égarer. */
  {
    href: '/compte/donnees',
    icon: DatabaseZap,
    titre: 'Mes informations',
    aide: 'Nom, téléphone, e-mail, export et suppression du compte',
  },
];

/** Une des quatre étapes de commande, avec son compteur. */
function Etape({
  href,
  icone: Icone,
  libelle,
  compte,
}: {
  readonly href: string;
  readonly icone: typeof Package;
  readonly libelle: string;
  readonly compte: number;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-surface-muted rounded-control flex flex-col items-center gap-1.5 px-1 py-3 text-center transition-colors"
    >
      <span className="relative">
        <Icone className="text-gold-600 h-6 w-6" aria-hidden />
        {/* La pastille ne s'affiche qu'au-dessus de zéro : un « 0 » sur chaque
            étape transforme le bandeau en tableau de bord vide. */}
        {compte > 0 ? (
          <span className="bg-danger-500 absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white">
            {compte > 99 ? '99+' : compte}
          </span>
        ) : null}
      </span>
      <span className="text-content text-xs leading-tight">{libelle}</span>
    </Link>
  );
}

function Rubrique({
  href,
  icone: Icone,
  titre,
  aide,
}: {
  readonly href: string;
  readonly icone: typeof Package;
  readonly titre: string;
  readonly aide: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3.5 transition-colors"
    >
      <Icone className="text-gold-600 h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-content block text-sm font-medium">{titre}</span>
        <span className="text-content-muted block truncate text-xs">{aide}</span>
      </span>
      <ChevronRight className="text-content-muted h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
    </Link>
  );
}

export default async function AccountPage() {
  // Le layout a déjà exigé une session ; cet appel est dédupliqué par React.
  const user = await getCurrentUser();
  if (!user) return null;

  const [etapes, suggestions] = await Promise.all([
    compterMesCommandes(user.id),
    listBestSellers(undefined, 8),
  ]);

  const initiale = user.fullName.trim().charAt(0).toUpperCase() || '?';
  const prenom = user.fullName.split(' ')[0];

  return (
    <>
      {/* ——— Bandeau d'identité ———
          Sombre et doré, comme l'en-tête du site. La référence est orange vif ;
          la couleur, elle, ne s'emprunte pas — c'est la marque qui la fixe. */}
      <section className="beral-surface-brand rounded-card flex items-center gap-4 p-5">
        <span
          className="bg-gold-400 text-ink-950 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
          aria-hidden
        >
          {initiale}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-ink-50 truncate text-lg font-bold">Bonjour {prenom}</h1>
          <p className="text-ink-400 beral-price truncate text-sm">{user.phone}</p>
          {user.role !== 'CLIENT' ? (
            <span className="bg-gold-400 text-ink-950 mt-1 inline-block rounded px-2 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase">
              {user.role === 'ADMIN' ? 'Administrateur' : 'Support'}
            </span>
          ) : null}
        </div>
        <Link
          href="/compte/donnees"
          aria-label="Modifier mes informations"
          className="text-ink-300 hover:bg-ink-800 hover:text-gold-300 rounded-control shrink-0 p-2 transition-colors"
        >
          <UserPen className="h-5 w-5" aria-hidden />
        </Link>
      </section>

      {/* ——— Étapes de commande ——— */}
      <section className="border-border bg-surface rounded-card shadow-card mt-4 overflow-hidden border">
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="text-content font-semibold">Mes commandes</h2>
          <Link
            href="/compte/commandes"
            className="text-content-muted hover:text-gold-700 text-xs whitespace-nowrap transition-colors"
          >
            Tout voir →
          </Link>
        </div>
        <div className="grid grid-cols-4">
          <Etape
            href="/compte/commandes?etape=paiement"
            icone={CreditCard}
            libelle="À payer"
            compte={etapes.paiement}
          />
          <Etape
            href="/compte/commandes?etape=preparation"
            icone={Package}
            libelle="En préparation"
            compte={etapes.preparation}
          />
          <Etape
            href="/compte/commandes?etape=livraison"
            icone={Truck}
            libelle="En livraison"
            compte={etapes.livraison}
          />
          <Etape
            href="/compte/commandes?etape=livrees"
            icone={PackageCheck}
            libelle="Livrées"
            compte={etapes.livrees}
          />
        </div>
      </section>

      {/* ——— Rubriques ——— */}
      <section className="border-border bg-surface rounded-card shadow-card divide-border mt-4 divide-y overflow-hidden border">
        {RUBRIQUES.map((r) => (
          <Rubrique
            key={r.titre}
            {...{ href: r.href, icone: r.icon, titre: r.titre, aide: r.aide }}
          />
        ))}

        {/* Le service client de la référence devient ici WhatsApp : c'est le
            canal réellement en service, et le seul numéro que la boutique
            publie. Un « centre d'aide » sans personne derrière serait pire que
            pas de lien du tout. */}
        <a
          href={`https://wa.me/${BOUTIQUE.whatsapp.replace('+', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <MessageCircle className="text-gold-600 h-5 w-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="text-content block text-sm font-medium">Nous contacter</span>
            <span className="text-content-muted block truncate text-xs">
              WhatsApp {BOUTIQUE.whatsapp} · {BOUTIQUE.email}
            </span>
          </span>
          <ChevronRight
            className="text-content-muted h-4 w-4 shrink-0 rtl:rotate-180"
            aria-hidden
          />
        </a>
      </section>

      {/* ——— Déconnexion et mentions ———
          Sur téléphone, le menu latéral est masqué : cette page porte donc les
          deux, sans quoi il n'y aurait plus aucun moyen de se déconnecter ni de
          lire les conditions de vente. */}
      <section className="border-border bg-surface rounded-card shadow-card mt-4 overflow-hidden border lg:hidden">
        {/* Déconnexion en POST, jamais en lien : un lien serait déclenché par un
            préchargement du navigateur ou par une image distante piégée. */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-content-muted hover:bg-surface-muted hover:text-danger-500 flex w-full items-center gap-3 px-4 py-3.5 text-sm transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            Se déconnecter
          </button>
        </form>
        <LegalLinks className="border-border border-t px-4 py-3" />
      </section>

      {/* ——— Suggestions ———
          De vrais produits de la boutique, classés par les ventes réelles.
          Aucune recommandation personnalisée : elle exigerait de suivre ce que
          chaque client regarde, ce que ce site s'interdit. */}
      {suggestions.items.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-content text-lg font-bold">Pour vous</h2>
            <Link
              href="/categories"
              className="text-content-muted hover:text-gold-700 text-xs whitespace-nowrap transition-colors"
            >
              Tout voir →
            </Link>
          </div>
          <ProductRail products={suggestions.items} />
        </section>
      ) : null}
    </>
  );
}
