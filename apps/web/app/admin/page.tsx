import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
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
  listAuditLog,
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
 * L'ordre de lecture suit les questions qu'on se pose en ouvrant l'écran le
 * matin : est-ce que quelque chose est cassé ? qu'est-ce qui attend que je m'en
 * occupe ? qu'est-ce qui est arrivé cette nuit ? qu'est-ce qui va manquer ?
 *
 * LE BANDEAU DE TÊTE EST SOMBRE, et c'est la décision qui tient tout le reste.
 * L'écran n'était que des cadres blancs sur fond crème : rien n'accrochait
 * l'œil, et les chiffres du jour — la seule chose qu'on vient vraiment lire —
 * avaient exactement le même poids visuel qu'un état vide. Le bandeau reprend
 * la teinte et l'or de la barre latérale, et il reste figé en haut quand on
 * fait défiler le reste : les constantes vitales ne quittent jamais l'écran.
 *
 * Le calme est l'état normal. Quatre voyants verts occupaient autrefois la
 * bande la plus visible tous les jours de l'année ; un tableau qui crie en
 * permanence n'est plus lu le jour où il a quelque chose à dire. Tant que tout
 * passe, l'état tient sur une ligne. Le détail ne revient que si un contrôle
 * échoue. Même principe pour les files : trois cadres affichant « 0 »
 * deviennent une phrase.
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

/* ═══════════════════════════ Habillage commun ═══════════════════════════ */

/**
 * Titre de panneau, barré d'or.
 *
 * Le filet doré donne un point de départ à chaque colonne, là où quatre
 * libellés gris flottaient sans attache sur le fond crème.
 */
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
      <h2 className="border-gold-400 text-content-muted border-s-2 ps-2 text-[0.65rem] font-semibold tracking-wider uppercase">
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
    <div
      className={`border-border bg-surface rounded-card shadow-card overflow-hidden border ${className}`}
    >
      {children}
    </div>
  );
}

function Vide({ children }: { readonly children: React.ReactNode }) {
  return <p className="text-content-muted px-4 py-4 text-sm">{children}</p>;
}

/* ═══════════════════════════ Bandeau de tête ═══════════════════════════ */

interface Controle {
  readonly libelle: string;
  readonly ok: boolean;
  readonly detail: string;
}

function LigneEtat({ controles }: { readonly controles: readonly Controle[] }) {
  const ennuis = controles.filter((c) => !c.ok);

  if (ennuis.length === 0) {
    return (
      <p className="text-ink-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <CircleCheck className="text-success-500 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-ink-100 font-medium">Exploitation nominale</span>
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
    <div className="mt-2">
      <p className="text-warning-500 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wider uppercase">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
        {ennuis.length} point{ennuis.length > 1 ? 's' : ''} à régler
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}

/** Une des trois colonnes de chiffres du bandeau. */
function Chiffre({
  titre,
  stats,
  vedette = false,
}: {
  readonly titre: string;
  readonly stats: DashboardStats['today'];
  readonly vedette?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`text-[0.6rem] font-semibold tracking-wider uppercase ${
          vedette ? 'text-gold-300' : 'text-ink-400'
        }`}
      >
        {titre}
      </p>
      <p
        className={`beral-price truncate font-bold ${
          vedette ? 'text-gold-300 text-2xl sm:text-3xl' : 'text-ink-100 mt-0.5 text-lg sm:text-xl'
        }`}
      >
        {fr(stats.revenue)}
      </p>
      <p className="text-ink-400 truncate text-[0.7rem]">
        {stats.orderCount} commande{stats.orderCount > 1 ? 's' : ''}
        {vedette ? ` · ${stats.itemsSold} article${stats.itemsSold > 1 ? 's' : ''}` : ''}
      </p>
    </div>
  );
}

/* ═══════════════════════════ Files d'attente ═══════════════════════════ */

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
      <div className="border-border bg-surface rounded-card shadow-card flex flex-wrap items-center gap-x-2 gap-y-1 border px-4 py-3">
        <CircleCheck className="text-success-500 h-4 w-4 shrink-0" aria-hidden />
        <span className="text-content text-sm font-medium">Rien n’attend d’action.</span>
        <span className="text-content-muted text-xs">
          {files.map((f) => `0 ${f.court}`).join(' · ')}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {files.map((f) => {
        const teinte = f.compte === 0 ? 'calme' : f.urgent ? 'danger' : 'warning';
        return (
          <Link
            key={f.libelle}
            href={f.href}
            className={`rounded-card shadow-card hover:shadow-raised group relative flex items-center justify-between gap-3 overflow-hidden border py-3.5 ps-5 pe-4 transition-shadow ${
              teinte === 'danger'
                ? 'border-danger-500/40 bg-danger-500/5'
                : teinte === 'warning'
                  ? 'border-warning-500/40 bg-warning-500/5'
                  : 'border-border bg-surface'
            }`}
          >
            {/* Liseré vertical : porte l'alerte sans teinter tout le cadre, et
                reste lisible pour qui distingue mal le rouge du vert. */}
            <span
              aria-hidden
              className={`absolute inset-y-0 start-0 w-1 ${
                teinte === 'danger'
                  ? 'bg-danger-500'
                  : teinte === 'warning'
                    ? 'bg-warning-500'
                    : 'bg-border'
              }`}
            />
            <span className="flex min-w-0 items-center gap-2.5">
              <f.icone
                className={`h-4 w-4 shrink-0 ${
                  teinte === 'danger'
                    ? 'text-danger-500'
                    : teinte === 'warning'
                      ? 'text-warning-500'
                      : 'text-content-muted'
                }`}
                aria-hidden
              />
              <span className="text-content truncate text-sm font-medium">{f.libelle}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`beral-price text-2xl font-bold ${
                  teinte === 'danger'
                    ? 'text-danger-500'
                    : teinte === 'warning'
                      ? 'text-warning-500'
                      : 'text-content-muted'
                }`}
              >
                {f.compte}
              </span>
              <ArrowRight
                className="text-content-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ Page ═══════════════════════════ */

export default async function AdminDashboardPage() {
  const [stats, lowStock, dernieres, journal] = await Promise.all([
    getDashboardStats(),
    listLowStock(6),
    listAdminOrders({ limit: 6 }),
    listAuditLog(8),
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
        {/* Les marges négatives font toucher le bandeau aux bords du panneau :
            posé dans le rembourrage, il aurait flotté comme une carte de plus,
            et c'est justement ce qu'il ne doit pas être. */}
        <div className="beral-surface-brand -mx-4 -mt-4 px-4 pt-4 pb-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h1 className="text-ink-50 text-xl font-bold sm:text-2xl">Supervision</h1>
            <p className="text-ink-400 beral-price text-xs">{horodatageLong.format(new Date())}</p>
          </div>

          <LigneEtat controles={controles} />

          <div className="beral-rule-gold mt-3" aria-hidden />

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Chiffre titre="Aujourd’hui" stats={stats.today} vedette />
            <div className="border-ink-800 border-s ps-3">
              <Chiffre titre="30 derniers jours" stats={stats.last30Days} />
            </div>
            <div className="border-ink-800 border-s ps-3">
              <Chiffre titre="Depuis l’ouverture" stats={stats.allTime} />
            </div>
          </div>
        </div>
      </ConsoleEnTete>

      <ConsoleCorps>
        {/* Colonne d'au moins la hauteur du panneau : quand la boutique est
            encore peu remplie, les repères de fond s'ancrent en bas au lieu de
            flotter au milieu d'une étendue vide. */}
        <div className="lg:flex lg:min-h-full lg:flex-col">
          <section className="mt-5">
            <TitrePanneau>En attente d’action</TitrePanneau>
            <Files files={files} />
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {/* ——— Dernières commandes ———
                C'est la question qu'on se pose en ouvrant l'écran : qu'est-ce
                qui est arrivé pendant que je ne regardais pas ? */}
            {/* Les deux colonnes prennent la meme hauteur : sans cela, un
                panneau court a gauche et deux panneaux a droite donnaient une
                rangee en escalier, qui se lit comme un gabarit casse. */}
            <section className="flex flex-col lg:col-span-2">
              <TitrePanneau lien="/admin/commandes" libelleLien="Toutes les commandes">
                Dernières commandes
              </TitrePanneau>
              <Panneau className="flex-1">
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
                          className="hover:bg-gold-50 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors"
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

            {/* ——— Colonne de droite : ce qui va manquer, ce qui part ——— */}
            <div className="flex flex-col gap-5">
              <section className="flex flex-1 flex-col">
                <TitrePanneau lien="/admin/produits" libelleLien="Stocks">
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

              <section className="flex flex-1 flex-col">
                <TitrePanneau>Meilleures ventes</TitrePanneau>
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
                            <span className="bg-ink-900 text-gold-300 beral-price flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold">
                              {rang + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="text-content block truncate font-medium">
                                {p.name}
                              </span>
                              <span className="text-content-muted beral-price block text-xs">
                                {p.quantitySold} vendu{p.quantitySold > 1 ? 's' : ''}
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
          </div>

          {/* ——— Journal des actions ———
              « Qui a modifié ça ? » est une question de supervision, et l'écran
              n'y répondait pas : le journal ne vivait que sur l'écran des
              paiements, où personne ne va le chercher. Les codes d’action restent
              bruts, en chasse fixe — les traduire, ce serait risquer de mal nommer
              une action que je n’ai pas énumérée. */}
          <section className="mt-5">
            <TitrePanneau>Activité récente</TitrePanneau>
            <Panneau>
              {journal.length === 0 ? (
                <Vide>
                  Aucune action enregistrée. Chaque modification faite depuis cet espace apparaîtra
                  ici, avec son auteur et son horodatage.
                </Vide>
              ) : (
                <ul className="divide-border divide-y">
                  {journal.map((entree, index) => (
                    <li
                      key={`${entree.createdAt.getTime()}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Activity className="text-gold-600 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="beral-price bg-surface-muted text-content rounded px-1.5 py-0.5 text-xs font-medium">
                          {entree.action}
                        </span>
                        <span className="text-content-muted truncate text-xs">
                          {entree.entityType}
                        </span>
                      </span>
                      <span className="text-content-muted text-xs">
                        {entree.actorName} ·{' '}
                        <span className="beral-price">{horodatage.format(entree.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panneau>
          </section>

          {/* ——— Repères de fond ——— */}
          <section className="border-border mt-6 border-t pt-4 pb-1 lg:mt-auto">
            <dl className="text-content-muted grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <Users className="text-gold-600 h-4 w-4 shrink-0" aria-hidden />
                <dt>Clients inscrits</dt>
                <dd className="beral-price text-content font-semibold">{stats.customerCount}</dd>
                <dd>(+{stats.newCustomers30Days} sur 30 j)</dd>
              </div>
              <div className="flex items-center gap-2">
                <Boxes className="text-gold-600 h-4 w-4 shrink-0" aria-hidden />
                <dt>Variantes sous seuil</dt>
                <dd className="beral-price text-content font-semibold">{stats.lowStockVariants}</dd>
              </div>
              <div className="flex items-center gap-2">
                <ReceiptText className="text-gold-600 h-4 w-4 shrink-0" aria-hidden />
                <dt>Commandes au total</dt>
                <dd className="beral-price text-content font-semibold">
                  {stats.allTime.orderCount}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="text-gold-600 h-4 w-4 shrink-0" aria-hidden />
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
