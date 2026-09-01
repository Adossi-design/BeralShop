import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  CircleCheck,
  Clock,
  PackageX,
  Users,
  Wallet,
} from 'lucide-react';

import { type DashboardStats, getDashboardStats, listLowStock } from '@beralshopp/core';
import { type Money, formatMoney } from '@beralshopp/shared';

export const metadata: Metadata = {
  title: 'Supervision',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Poste de supervision de la boutique.
 *
 * CE N'EST PAS UNE PAGE DE LA BOUTIQUE, et cela doit se voir en une seconde.
 * L'ordre de lecture répond à une seule question : « quelque chose demande-t-il
 * mon attention maintenant ? »
 *
 *   1. l'état d'exploitation — ce qui bloque une vente ;
 *   2. ce qui attend une action, avec le lien qui y mène ;
 *   3. les chiffres, du jour au cumul ;
 *   4. les stocks au bord de la rupture.
 *
 * Les chiffres passent avant le décor : pas de grandes cartes aérées, mais des
 * lignes denses et des chiffres à chasse fixe qui s'alignent et se comparent
 * d'un coup d'œil. Une console de pilotage se lit, elle ne se contemple pas.
 */

function fr(value: Money): string {
  return formatMoney(value, 'fr');
}

/* ═══════════════════════════ Bandeau d'état ═══════════════════════════ */

function Etat({
  libelle,
  ok,
  detail,
}: {
  readonly libelle: string;
  readonly ok: boolean;
  readonly detail: string;
}) {
  const Icone = ok ? CircleCheck : CircleAlert;
  return (
    <div className="flex items-start gap-2">
      <Icone
        className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? 'text-success-500' : 'text-warning-500'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-ink-100 text-xs font-semibold">{libelle}</p>
        <p className="text-ink-400 text-xs">{detail}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════ File d'attente ═══════════════════════════ */

function Attente({
  libelle,
  compte,
  href,
  icone: Icone,
  urgent,
}: {
  readonly libelle: string;
  readonly compte: number;
  readonly href: string;
  readonly icone: typeof Clock;
  readonly urgent: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-control group flex items-center justify-between gap-3 border px-4 py-3 transition-colors ${
        compte === 0
          ? 'border-border bg-surface'
          : urgent
            ? 'border-danger-500/40 bg-danger-500/5 hover:border-danger-500'
            : 'border-warning-500/40 bg-warning-500/5 hover:border-warning-500'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icone
          className={`h-4 w-4 shrink-0 ${
            compte === 0 ? 'text-content-muted' : urgent ? 'text-danger-500' : 'text-warning-500'
          }`}
          aria-hidden
        />
        <span className="text-content text-sm font-medium">{libelle}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="beral-price text-content text-lg font-bold">{compte}</span>
        <ArrowRight
          className="text-content-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}

/* ═══════════════════════════ Colonne de chiffres ═══════════════════════════ */

function Periode({
  titre,
  stats,
  accent,
}: {
  readonly titre: string;
  readonly stats: DashboardStats['today'];
  readonly accent?: boolean;
}) {
  return (
    <div
      className={`rounded-control border p-4 ${
        accent ? 'border-gold-300 bg-gold-50' : 'border-border bg-surface'
      }`}
    >
      <p className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
        {titre}
      </p>
      <p className="beral-price text-content mt-2 text-xl font-bold">{fr(stats.revenue)}</p>
      <dl className="text-content-muted mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt>Commandes</dt>
          <dd className="beral-price text-content font-medium">{stats.orderCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Articles vendus</dt>
          <dd className="beral-price text-content font-medium">{stats.itemsSold}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Panier moyen</dt>
          <dd className="beral-price text-content font-medium">{fr(stats.averageBasket)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [stats, lowStock] = await Promise.all([getDashboardStats(), listLowStock(8)]);

  const paiementConfigure =
    process.env['PESAPAL_ENVIRONMENT'] === 'production' && Boolean(process.env['PESAPAL_IPN_ID']);
  const stockageConfigure = Boolean(process.env['BLOB_READ_WRITE_TOKEN']);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-content text-xl font-bold sm:text-2xl">Supervision</h1>
        <p className="text-content-muted beral-price text-xs">
          {new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>

      {/* ——— 1. État d'exploitation ———
          Sur fond sombre, comme la barre latérale : c'est l'état de la machine,
          pas une donnée commerciale. */}
      <section className="beral-surface-brand rounded-card mt-4 p-4">
        <h2 className="text-gold-300 text-[0.65rem] font-semibold tracking-wider uppercase">
          État d’exploitation
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Etat
            libelle="Encaissement"
            ok={paiementConfigure}
            detail={paiementConfigure ? 'Pesapal en production' : 'Non opérationnel'}
          />
          <Etat
            libelle="Photos produits"
            ok={stockageConfigure}
            detail={stockageConfigure ? 'Stockage actif' : 'Téléversement indisponible'}
          />
          <Etat
            libelle="Catalogue"
            ok={stats.activeProducts > 0}
            detail={`${stats.activeProducts} produit${stats.activeProducts > 1 ? 's' : ''} en vente`}
          />
          <Etat
            libelle="Stocks"
            ok={stats.outOfStockVariants === 0}
            detail={
              stats.outOfStockVariants === 0
                ? 'Aucune rupture'
                : `${stats.outOfStockVariants} variante(s) en rupture`
            }
          />
        </div>
      </section>

      {/* ——— 2. Ce qui attend une action ——— */}
      <section className="mt-5">
        <h2 className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
          En attente d’action
        </h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Attente
            libelle="Commandes à préparer"
            compte={stats.toProcess}
            href="/admin/commandes?statut=PAID"
            icone={Boxes}
            urgent
          />
          <Attente
            libelle="Paiements attendus"
            compte={stats.awaitingPayment}
            href="/admin/commandes?statut=PENDING_PAYMENT"
            icone={Clock}
            urgent={false}
          />
          <Attente
            libelle="Variantes en rupture"
            compte={stats.outOfStockVariants}
            href="/admin/produits"
            icone={PackageX}
            urgent={false}
          />
        </div>
      </section>

      {/* ——— 3. Chiffres ——— */}
      <section className="mt-5">
        <h2 className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
          Ventes
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Periode titre="Aujourd’hui" stats={stats.today} accent />
          <Periode titre="30 derniers jours" stats={stats.last30Days} />
          <Periode titre="Depuis l’ouverture" stats={stats.allTime} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* ——— 4. Stocks au bord de la rupture ——— */}
        <section>
          <h2 className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
            Stocks à surveiller
          </h2>
          <div className="border-border bg-surface rounded-card mt-2 overflow-hidden border">
            {lowStock.length === 0 ? (
              <p className="text-content-muted p-4 text-sm">
                Aucune variante sous son seuil d’alerte.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {lowStock.map((v) => (
                    <tr key={v.variantId} className="border-border border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/produits/${v.productSlug}`}
                          className="text-content hover:text-gold-700 font-medium transition-colors"
                        >
                          {v.productName}
                        </Link>
                        <p className="text-content-muted beral-price text-xs">{v.sku}</p>
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        <span
                          className={`beral-price font-bold ${
                            v.available === 0 ? 'text-danger-500' : 'text-warning-500'
                          }`}
                        >
                          {v.available}
                        </span>
                        <span className="text-content-muted text-xs"> / {v.threshold}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ——— 5. Ce qui se vend ——— */}
        <section>
          <h2 className="text-content-muted text-[0.65rem] font-semibold tracking-wider uppercase">
            Meilleures ventes — depuis l’ouverture
          </h2>
          <div className="border-border bg-surface rounded-card mt-2 overflow-hidden border">
            {stats.topProducts.length === 0 ? (
              <p className="text-content-muted p-4 text-sm">
                Aucune vente enregistrée. Les chiffres apparaîtront dès la première commande payée.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {stats.topProducts.map((p) => (
                    <tr key={p.sku} className="border-border border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="text-content font-medium">{p.name}</p>
                        <p className="text-content-muted beral-price text-xs">
                          {p.sku} · {p.quantitySold} vendu{p.quantitySold > 1 ? 's' : ''}
                        </p>
                      </td>
                      <td className="beral-price text-content px-4 py-2.5 text-end font-bold">
                        {fr(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* ——— Repères de fond ——— */}
      <section className="border-border mt-6 border-t pt-4">
        <dl className="text-content-muted grid gap-3 text-xs sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            <dt>Clients inscrits</dt>
            <dd className="beral-price text-content font-semibold">{stats.customerCount}</dd>
            <dd className="text-content-muted">(+{stats.newCustomers30Days} sur 30 j)</dd>
          </div>
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 shrink-0" aria-hidden />
            <dt>Variantes sous seuil</dt>
            <dd className="beral-price text-content font-semibold">{stats.lowStockVariants}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0" aria-hidden />
            <dt>Devise de référence</dt>
            <dd className="text-content font-semibold">RWF</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
