import type { Metadata } from 'next';
import { Search } from 'lucide-react';

import { listAdminCustomers } from '@beralshopp/core';
import { FUSEAU_BOUTIQUE, formatMoney } from '@beralshopp/shared';

import { toggleCustomerAction } from '@/lib/admin-actions';
import { ConsoleEnTete, ConsoleTableau } from '@/components/admin/console';

export const metadata: Metadata = {
  title: 'Clients',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeZone: FUSEAU_BOUTIQUE,
});

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = typeof params['q'] === 'string' ? params['q'] : '';

  const customers = await listAdminCustomers({ ...(query ? { query } : {}), limit: 100 });

  return (
    <>
      <ConsoleEnTete>
        <h1 className="text-content text-xl font-bold sm:text-2xl">Clients</h1>
        <p className="text-content-muted mt-1 text-sm">
          {customers.length} client{customers.length > 1 ? 's' : ''}
        </p>

        <form method="get" className="mt-4 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search
              className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={query}
              placeholder="Nom, téléphone ou e-mail…"
              aria-label="Rechercher un client"
              className="border-border bg-surface text-content rounded-control h-10 w-full border ps-9 pe-3 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="border-border text-content hover:border-gold-400 rounded-control border px-4 text-sm font-medium transition-colors"
          >
            Chercher
          </button>
        </form>
      </ConsoleEnTete>

      {customers.length === 0 ? (
        <div className="border-border bg-surface rounded-card mt-6 border border-dashed px-6 py-12 text-center">
          <p className="text-content-muted text-sm">Aucun client ne correspond.</p>
        </div>
      ) : (
        <ConsoleTableau>
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-surface-muted text-content-muted sticky top-0 z-10 text-xs">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">Client</th>
                <th className="px-4 py-2.5 text-end font-medium">Commandes</th>
                <th className="px-4 py-2.5 text-end font-medium">Total dépensé</th>
                <th className="px-4 py-2.5 text-start font-medium">Inscrit le</th>
                <th className="px-4 py-2.5 text-end font-medium">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <span className="text-content block font-medium">{customer.fullName}</span>
                    <span className="text-content-muted beral-price block text-xs">
                      {customer.phone}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </span>
                  </td>
                  <td className="beral-price text-content px-4 py-3 text-end">
                    {customer.orderCount}
                  </td>
                  <td className="beral-price text-content px-4 py-3 text-end font-semibold">
                    {formatMoney(customer.totalSpent, 'fr')}
                  </td>
                  <td className="text-content-muted px-4 py-3 text-xs">
                    {dateFormat.format(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {/* Désactiver révoque immédiatement les sessions du client :
                          c'est tout l'intérêt des sessions en base plutôt que JWT. */}
                    <form action={toggleCustomerAction} className="inline">
                      <input type="hidden" name="userId" value={customer.id} />
                      <input type="hidden" name="isActive" value={customer.isActive ? '0' : '1'} />
                      <button
                        type="submit"
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                          customer.isActive
                            ? 'text-content-muted hover:text-danger-500'
                            : 'bg-danger-500/10 text-danger-500 hover:opacity-80'
                        }`}
                      >
                        {customer.isActive ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ConsoleTableau>
      )}
    </>
  );
}
