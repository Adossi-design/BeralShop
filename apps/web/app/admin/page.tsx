import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Clock, PackageX, TrendingUp } from 'lucide-react';

import { getDashboardStats, listLowStock } from '@beralshopp/core';
import { type Money, formatMoney } from '@beralshopp/shared';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function StatCard({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div className="border-border bg-surface rounded-card border p-4">
      <p className="text-content-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="beral-price text-content mt-2 text-2xl font-bold">{value}</p>
      {hint ? <p className="text-content-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

function euros(value: Money): string {
  return formatMoney(value, 'fr');
}

export default async function AdminDashboardPage() {
  const [stats, lowStock] = await Promise.all([getDashboardStats(), listLowStock(8)]);

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Tableau de bord</h1>
      <p className="text-content-muted mt-1 text-sm">
        Le chiffre d&apos;affaires ne compte que les commandes réellement encaissées.
      </p>

      {/* ——— Actions requises, en premier : c'est ce qui demande une décision ——— */}
      {stats.toProcess > 0 || stats.outOfStockVariants > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {stats.toProcess > 0 ? (
            <Link
              href="/admin/commandes?statut=PAID"
              className="border-success-500/40 bg-success-500/5 rounded-card flex items-center gap-3 border p-4 transition-opacity hover:opacity-90"
            >
              <TrendingUp className="text-success-500 h-6 w-6 shrink-0" aria-hidden />
              <span>
                <span className="text-content block font-semibold">
                  {stats.toProcess} commande{stats.toProcess > 1 ? 's' : ''} à préparer
                </span>
                <span className="text-content-muted text-xs">Payées, en attente de traitement</span>
              </span>
            </Link>
          ) : null}

          {stats.outOfStockVariants > 0 ? (
            <Link
              href="/admin/produits"
              className="border-danger-500/40 bg-danger-500/5 rounded-card flex items-center gap-3 border p-4 transition-opacity hover:opacity-90"
            >
              <PackageX className="text-danger-500 h-6 w-6 shrink-0" aria-hidden />
              <span>
                <span className="text-content block font-semibold">
                  {stats.outOfStockVariants} variante
                  {stats.outOfStockVariants > 1 ? 's' : ''} en rupture
                </span>
                <span className="text-content-muted text-xs">Invisibles à la vente</span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ——— Chiffres ——— */}
      <section className="mt-6">
        <h2 className="text-content mb-3 text-sm font-semibold">Aujourd&apos;hui</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={euros(stats.today.revenue)} />
          <StatCard label="Commandes" value={String(stats.today.orderCount)} />
          <StatCard label="Articles vendus" value={String(stats.today.itemsSold)} />
          <StatCard label="Panier moyen" value={euros(stats.today.averageBasket)} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-sm font-semibold">30 derniers jours</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={euros(stats.last30Days.revenue)} />
          <StatCard label="Commandes" value={String(stats.last30Days.orderCount)} />
          <StatCard label="Articles vendus" value={String(stats.last30Days.itemsSold)} />
          <StatCard label="Panier moyen" value={euros(stats.last30Days.averageBasket)} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-sm font-semibold">Depuis le début</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={euros(stats.allTime.revenue)} />
          <StatCard
            label="Commandes"
            value={String(stats.allTime.orderCount)}
            {...(stats.awaitingPayment > 0
              ? { hint: `${stats.awaitingPayment} en attente de paiement` }
              : {})}
          />
          <StatCard
            label="Clients"
            value={String(stats.customerCount)}
            hint={`${stats.newCustomers30Days} nouveaux sur 30 jours`}
          />
          <StatCard label="Produits actifs" value={String(stats.activeProducts)} />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* ——— Meilleures ventes ——— */}
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content font-semibold">Meilleures ventes</h2>

          {stats.topProducts.length === 0 ? (
            <p className="text-content-muted mt-3 text-sm">
              Aucune vente encaissée pour le moment.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {stats.topProducts.map((product, index) => (
                <li key={product.sku} className="flex items-center gap-3 text-sm">
                  <span className="bg-surface-muted text-content-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-content block truncate">{product.name}</span>
                    <span className="text-content-muted beral-price text-xs">{product.sku}</span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="text-content block font-semibold">{product.quantitySold}</span>
                    <span className="text-content-muted beral-price text-xs">
                      {euros(product.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ——— Réapprovisionnement ——— */}
        <section className="border-border bg-surface rounded-card border p-5">
          <h2 className="text-content flex items-center gap-2 font-semibold">
            <AlertTriangle className="text-warning-500 h-4 w-4" aria-hidden />À réapprovisionner
          </h2>

          {lowStock.length === 0 ? (
            <p className="text-content-muted mt-3 text-sm">
              Tous les stocks sont au-dessus de leur seuil d&apos;alerte.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {lowStock.map((variant) => (
                <li key={variant.variantId} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="text-content block truncate">{variant.productName}</span>
                    <span className="text-content-muted beral-price text-xs">{variant.sku}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                      variant.available === 0
                        ? 'bg-danger-500/10 text-danger-500'
                        : 'bg-warning-500/10 text-warning-500'
                    }`}
                  >
                    {variant.available === 0 ? 'Rupture' : `${variant.available} restant`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/admin/produits"
            className="text-gold-700 mt-4 inline-block text-sm hover:underline"
          >
            Gérer les stocks →
          </Link>
        </section>
      </div>

      {stats.awaitingPayment > 0 ? (
        <p className="border-gold-300 bg-gold-50 text-gold-900 rounded-control mt-6 flex items-start gap-2 border px-4 py-3 text-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {stats.awaitingPayment} commande{stats.awaitingPayment > 1 ? 's' : ''} en attente de
            paiement. Le stock correspondant est immobilisé et sera libéré automatiquement après 30
            minutes.
          </span>
        </p>
      ) : null}
    </>
  );
}
