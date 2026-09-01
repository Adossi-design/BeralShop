import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  CircleCheck,
  Clock,
  PackageX,
  ReceiptText,
  Users,
  Wallet,
} from 'lucide-react';

import {
  type DashboardStats,
  getDashboardStats,
  listAdminOrders,
  listLowStock,
} from '@beralshopp/core';
import { FUSEAU_BOUTIQUE, type Money, formatMoney } from '@beralshopp/shared';

import { ConsoleCorps, ConsoleEnTete } from '@/components/admin/console';
import { OrderStatusBadge } from '@/components/admin/order-status-badge';

export const metadata: Metadata = {
  title: 'Supervision',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Poste de supervision de la boutique.
 *
 * CE N'EST PAS UNE PAGE DE LA BOUTIQUE, et cela doit se voir en une seconde.
 * L'ordre de lecture suit les questions qu'on se pose en ouvrant l'écran le
 * matin, dans cet ordre :
 *
 *   1. « Est-ce que quelque chose est cassé ? »   → le bandeau d'état
 *   2. « Qu'est-ce qui attend que je m'en occupe ? » → les files
 *   3. « Qu'est-ce qui est arrivé depuis hier ? »  → les dernières commandes
 *   4. « Combien ai-je vendu ? »                   → les ventes
 *   5. « Qu'est-ce qui va manquer ? »              → les stocks
 *
 * DEUX RÈGLES DE CONCEPTION, tirées de ce que le premier jet faisait mal.
 *
 * Le calme est l'état normal. Quatre voyants verts occupaient la bande la plus
 * visible de l'écran tous les jours de l'année ; un tableau qui crie en
 * permanence n'est plus lu le jour où il a quelque chose à dire. Quand tout va
 * bien, l'état tient sur une ligne grise. Le bloc sombre ne revient que si un
 * contrôle échoue. Même principe pour les files d'attente : trois cadres
 * affichant « 0 » deviennent une seule phrase.
 *
 * Les chiffres passent avant le décor. Lignes denses, chiffres à chasse fixe
 * qui s'alignent et se comparent d'un coup d'œil. Une console de pilotage se
 * lit, elle ne se contemple pas.
 */

function fr(value: Money): string {
  return formatMoney(value, 'fr');
}

/* Le fuseau est OBLIGATOIRE : le serveur de production tourne en UTC et
   afficherait, sans lui, des heures en retard de deux heures sur Kigali. */
const horodatage = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSEAU_BOUTIQUE,
});

const horodatageLong = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: FUSEAU_BOUTIQUE,
});

/* ═══════════════════════════ Titre de panneau ═══════════════════════════ */

function TitrePanneau({
  children,
  lien,
  libelleLien,
}: {
  readonly children: React.ReactNode;
  readonly lien?: string;
  readonly libelleLien?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
        {children}
      </h2>
      {lien ? (
        <Link
          href={lien}
          className="text-content-muted hover:text-gold-700 text-xs whitespace-nowrap transition-colors"
        >
          {libelleLien} →
        </Link>
      ) : null}
    </div>
  );
}

function Panneau({
  children,
  className = '',
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`border-border bg-surface rounded-card overflow-hidden border ${className}`}>
      {children}
    </div>
  );
}

function Vide({ children }: { readonly children: React.ReactNode }) {
  return <p className="text-content-muted px-4 py-4 text-sm">{children}</p>;
}

/* ═══════════════════════════ 1. État d'exploitation ═══════════════════════════ */

interface Controle {
  readonly libelle: string;
  readonly ok: boolean;
  readonly detail: string;
}

function BandeauEtat({ controles }: { readonly controles: readonly Controle[] }) {
  const ennuis = controles.filter((c) => !c.ok);

  /* Tout va bien : une ligne, et on passe à autre chose. */
  if (ennuis.length === 0) {
    return (
      <p className="text-content-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <CircleCheck className="text-success-500 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-content font-medium">Exploitation nominale</span>
        {controles.map((c) => (
          <span key={c.libelle} className="before:mr-2 before:content-['·']">
            {c.detail}
          </span>
        ))}
      </p>
    );
  }

  /* Quelque chose cloche : on montre les QUATRE contrôles, pas seulement les
     fautifs. Sur un poste de supervision, ce qui fonctionne encore fait partie
     du diagnostic. */
  return (
    <section className="beral-surface-brand rounded-card mt-3 p-4">
      <h2 className="text-warning-500 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wider uppercase">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
        {ennuis.length} point{ennuis.length > 1 ? 's' : ''} à régler
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {controles.map((c) => {
          const Icone = c.ok ? CircleCheck : CircleAlert;
          return (
            <div key={c.libelle} className="flex items-start gap-2">
              <Icone
                className={`mt-0.5 h-4 w-4 shrink-0 ${c.ok ? 'text-success-500' : 'text-warning-500'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-ink-100 text-xs font-semibold">{c.libelle}</p>
                <p className={`text-xs ${c.ok ? 'text-ink-400' : 'text-warning-500'}`}>
                  {c.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════ 2. Files d'attente ═══════════════════════════ */

interface File {
  readonly libelle: string;
  readonly court: string;
  readonly compte: number;
  readonly href: string;
  readonly icone: typeof Clock;
  readonly urgent: boolean;
}

function Files({ files }: { readonly files: readonly File[] }) {
  /* Trois cadres affichant « 0 » occupent le tiers de l'écran pour dire qu'il
     n'y a rien à faire. Une phrase suffit — et elle donne quand même les trois
     compteurs, pour qu'on sache qu'ils ont été regardés. */
  if (files.every((f) => f.compte === 0)) {
    return (
      <div className="border-border bg-surface rounded-card flex flex-wrap items-center gap-x-2 gap-y-1 border px-4 py-3">
        <CircleCheck className="text-success-500 h-4 w-4 shrink-0" aria-hidden />
        <span className="text-content text-sm font-medium">Rien n’attend d’action.</span>
        <span className="text-content-muted text-xs">
          {files.map((f) => `0 ${f.court}`).join(' · ')}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {files.map((f) => (
        <Link
          key={f.libelle}
          href={f.href}
          className={`rounded-card group flex items-center justify-between gap-3 border px-4 py-3 transition-colors ${
            f.compte === 0
              ? 'border-border bg-surface'
              : f.urgent
                ? 'border-danger-500/40 bg-danger-500/5 hover:border-danger-500'
                : 'border-warning-500/40 bg-warning-500/5 hover:border-warning-500'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <f.icone
              className={`h-4 w-4 shrink-0 ${
                f.compte === 0
                  ? 'text-content-muted'
                  : f.urgent
                    ? 'text-danger-500'
                    : 'text-warning-500'
              }`}
              aria-hidden
            />
            <span className="text-content truncate text-sm font-medium">{f.libelle}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="beral-price text-content text-lg font-bold">{f.compte}</span>
            <ArrowRight
              className="text-content-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ═══════════════════════════ 3. Ventes ═══════════════════════════ */

function LignePeriode({
  titre,
  stats,
}: {
  readonly titre: string;
  readonly stats: DashboardStats['today'];
}) {
  return (
    <div className="border-border flex items-baseline justify-between gap-3 border-t px-4 py-3">
      <div className="min-w-0">
        <p className="text-content text-sm">{titre}</p>
        <p className="text-content-muted text-xs">
          {stats.orderCount} commande{stats.orderCount > 1 ? 's' : ''} · panier{' '}
          <span className="beral-price">{fr(stats.averageBasket)}</span>
        </p>
      </div>
      <p className="beral-price text-content shrink-0 font-semibold">{fr(stats.revenue)}</p>
    </div>
  );
}

/* ═══════════════════════════ Page ═══════════════════════════ */

export default async function AdminDashboardPage() {
  const [stats, lowStock, dernieres] = await Promise.all([
    getDashboardStats(),
    listLowStock(6),
    listAdminOrders({ limit: 6 }),
  ]);

  const paiementConfigure =
    process.env['PESAPAL_ENVIRONMENT'] === 'production' && Boolean(process.env['PESAPAL_IPN_ID']);
  const stockageConfigure = Boolean(process.env['BLOB_READ_WRITE_TOKEN']);

  const controles: readonly Controle[] = [
    {
      libelle: 'Encaissement',
      ok: paiementConfigure,
      detail: paiementConfigure ? 'Pesapal en production' : 'Paiement non opérationnel',
    },
    {
      libelle: 'Photos produits',
      ok: stockageConfigure,
      detail: stockageConfigure ? 'Stockage actif' : 'Téléversement indisponible',
    },
    {
      libelle: 'Catalogue',
      ok: stats.activeProducts > 0,
      detail:
        stats.activeProducts > 0
          ? `${stats.activeProducts} produit${stats.activeProducts > 1 ? 's' : ''} en vente`
          : 'Aucun produit en vente',
    },
    {
      libelle: 'Stocks',
      ok: stats.outOfStockVariants === 0,
      detail:
        stats.outOfStockVariants === 0
          ? 'Aucune rupture'
          : `${stats.outOfStockVariants} variante${stats.outOfStockVariants > 1 ? 's' : ''} en rupture`,
    },
  ];

  const files: readonly File[] = [
    {
      libelle: 'Commandes à préparer',
      court: 'à préparer',
      compte: stats.toProcess,
      href: '/admin/commandes?statut=PAID',
      icone: Boxes,
      urgent: true,
    },
    {
      libelle: 'Paiements attendus',
      court: 'paiement attendu',
      compte: stats.awaitingPayment,
      href: '/admin/commandes?statut=PENDING_PAYMENT',
      icone: Clock,
      urgent: false,
    },
    {
      libelle: 'Variantes en rupture',
      court: 'rupture',
      compte: stats.outOfStockVariants,
      href: '/admin/produits',
      icone: PackageX,
      urgent: false,
    },
  ];

  return (
    <>
      <ConsoleEnTete>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h1 className="text-content text-xl font-bold sm:text-2xl">Supervision</h1>
          <p className="text-content-muted beral-price text-xs">
            {horodatageLong.format(new Date())}
          </p>
        </div>
        <BandeauEtat controles={controles} />
      </ConsoleEnTete>

      <ConsoleCorps>
        {/* Colonne d'au moins la hauteur du panneau : quand la boutique est
            encore peu remplie, les reperes de fond s'ancrent en bas au lieu de
            flotter au milieu d'une etendue vide, qui se lit comme un ecran
            inacheve. Des que les donnees arrivent, la colonne s'allonge et le
            pied reprend sa place a la suite. */}
        <div className="lg:flex lg:min-h-full lg:flex-col">
          <section className="mt-4">
            <TitrePanneau>En attente d’action</TitrePanneau>
            <Files files={files} />
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {/* ——— Ventes ——— */}
            <section className="lg:col-span-1">
              <TitrePanneau>Ventes</TitrePanneau>
              <Panneau>
                {/* Le chiffre du jour est celui qu'on vient chercher ; les deux
                  autres périodes lui donnent son échelle. Trois cartes de même
                  taille laissaient le lecteur choisir laquelle regarder. */}
                <div className="bg-gold-50 px-4 py-3">
                  <p className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
                    Aujourd’hui
                  </p>
                  <p className="beral-price text-content mt-1 text-2xl font-bold">
                    {fr(stats.today.revenue)}
                  </p>
                  <p className="text-content-muted text-xs">
                    {stats.today.orderCount} commande{stats.today.orderCount > 1 ? 's' : ''} ·{' '}
                    {stats.today.itemsSold} article{stats.today.itemsSold > 1 ? 's' : ''}
                  </p>
                </div>
                <LignePeriode titre="30 derniers jours" stats={stats.last30Days} />
                <LignePeriode titre="Depuis l’ouverture" stats={stats.allTime} />
              </Panneau>
            </section>

            {/* ——— Dernières commandes ———
              Le premier jet n'en montrait aucune. C'est pourtant la question
              qu'on se pose en ouvrant l'écran : qu'est-ce qui est arrivé
              pendant que je ne regardais pas ? */}
            <section className="lg:col-span-2">
              <TitrePanneau lien="/admin/commandes" libelleLien="Toutes les commandes">
                Dernières commandes
              </TitrePanneau>
              <Panneau>
                {dernieres.rows.length === 0 ? (
                  <Vide>
                    Aucune commande pour le moment. La première apparaîtra ici dès qu’un client aura
                    validé son panier.
                  </Vide>
                ) : (
                  <ul className="divide-border divide-y">
                    {dernieres.rows.map((order) => (
                      <li key={order.orderNumber}>
                        <Link
                          href={`/admin/commandes/${order.orderNumber}`}
                          className="hover:bg-surface-muted/60 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="beral-price text-content text-sm font-semibold">
                                {order.orderNumber}
                              </span>
                              <OrderStatusBadge status={order.status} />
                            </span>
                            <span className="text-content-muted block truncate text-xs">
                              {order.customerName} · {order.itemCount} article
                              {order.itemCount > 1 ? 's' : ''} ·{' '}
                              <span className="beral-price">
                                {horodatage.format(order.placedAt)}
                              </span>
                            </span>
                          </span>
                          <span className="beral-price text-content shrink-0 text-sm font-semibold">
                            {fr(order.total)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* ——— Stocks au bord de la rupture ——— */}
            <section className="flex flex-col">
              <TitrePanneau lien="/admin/produits" libelleLien="Gérer les stocks">
                Stocks à surveiller
              </TitrePanneau>
              <Panneau className="flex-1">
                {lowStock.length === 0 ? (
                  <Vide>
                    Aucune variante sous son seuil d’alerte. Les articles proches de la rupture
                    s’afficheront ici avant de manquer.
                  </Vide>
                ) : (
                  <ul className="divide-border divide-y">
                    {lowStock.map((v) => (
                      <li
                        key={v.variantId}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <span className="min-w-0">
                          <Link
                            href={`/produits/${v.productSlug}`}
                            className="text-content hover:text-gold-700 block truncate text-sm font-medium transition-colors"
                          >
                            {v.productName}
                          </Link>
                          <span className="text-content-muted beral-price text-xs">{v.sku}</span>
                        </span>
                        <span className="shrink-0 text-end">
                          <span
                            className={`beral-price font-bold ${
                              v.available === 0 ? 'text-danger-500' : 'text-warning-500'
                            }`}
                          >
                            {v.available}
                          </span>
                          <span className="text-content-muted beral-price text-xs">
                            {' '}
                            / {v.threshold}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>
            </section>

            {/* ——— Ce qui se vend ——— */}
            <section className="flex flex-col">
              <TitrePanneau>Meilleures ventes — depuis l’ouverture</TitrePanneau>
              <Panneau className="flex-1">
                {stats.topProducts.length === 0 ? (
                  <Vide>
                    Aucune vente enregistrée. Le classement se remplira dès la première commande
                    payée.
                  </Vide>
                ) : (
                  <ul className="divide-border divide-y">
                    {stats.topProducts.map((p, rang) => (
                      <li
                        key={p.sku}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="beral-price text-content-muted w-4 shrink-0 text-xs">
                            {rang + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="text-content block truncate font-medium">
                              {p.name}
                            </span>
                            <span className="text-content-muted beral-price block text-xs">
                              {p.sku} · {p.quantitySold} vendu{p.quantitySold > 1 ? 's' : ''}
                            </span>
                          </span>
                        </span>
                        <span className="beral-price text-content shrink-0 font-semibold">
                          {fr(p.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>
            </section>
          </div>

          {/* ——— Repères de fond ——— */}
          <section className="border-border mt-6 border-t pt-4 pb-1 lg:mt-auto">
            <dl className="text-content-muted grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                <dt>Clients inscrits</dt>
                <dd className="beral-price text-content font-semibold">{stats.customerCount}</dd>
                <dd>(+{stats.newCustomers30Days} sur 30 j)</dd>
              </div>
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 shrink-0" aria-hidden />
                <dt>Variantes sous seuil</dt>
                <dd className="beral-price text-content font-semibold">{stats.lowStockVariants}</dd>
              </div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 shrink-0" aria-hidden />
                <dt>Commandes au total</dt>
                <dd className="beral-price text-content font-semibold">
                  {stats.allTime.orderCount}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 shrink-0" aria-hidden />
                <dt>Devise de référence</dt>
                <dd className="text-content font-semibold">RWF</dd>
              </div>
            </dl>
          </section>
        </div>
      </ConsoleCorps>
    </>
  );
}
