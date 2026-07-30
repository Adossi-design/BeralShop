import type { Metadata } from 'next';
import { PackageSearch } from 'lucide-react';

import { trackOrder } from '@beralshopp/core';
import { normalizeOrderNumberInput } from '@beralshopp/shared';

import { OrderDetail } from '@/components/orders/order-detail';

export const metadata: Metadata = {
  title: 'Suivre ma commande',
  description: 'Suivez votre commande Beralshopp avec votre numéro de commande et votre téléphone.',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Suivi public.
 *
 * Le numéro NE SUFFIT PAS : le téléphone est exigé. Sans lui, un numéro de commande
 * deviné — ils sont séquentiels — donnerait accès au nom, à l'adresse et au contenu
 * de la commande d'un inconnu.
 *
 * Formulaire en GET : la recherche reste dans l'URL, donc rechargeable et partageable
 * par le client avec le service après-vente.
 */
export default async function TrackingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawNumber = single(params['numero']).trim();
  const phone = single(params['tel']).trim();

  const normalized = rawNumber ? normalizeOrderNumberInput(rawNumber) : null;
  const hasQuery = rawNumber.length > 0 && phone.length > 0;

  const order = hasQuery && normalized ? await trackOrder(normalized, phone) : null;

  return (
    <main id="contenu" className="beral-container flex-1 py-8">
      <h1 className="text-content text-xl font-bold sm:text-2xl">Suivre ma commande</h1>
      <p className="text-content-muted mt-1 text-sm">
        Saisissez votre numéro de commande et le téléphone utilisé lors de l&apos;achat.
      </p>

      <form method="get" className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="numero" className="text-content block text-sm font-medium">
            Numéro de commande
          </label>
          <input
            id="numero"
            name="numero"
            defaultValue={rawNumber}
            placeholder="BRL-2026-000123"
            required
            className="border-border rounded-control bg-surface text-content beral-price mt-1.5 h-11 w-full border px-3 text-base focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tel" className="text-content block text-sm font-medium">
            Téléphone
          </label>
          <input
            id="tel"
            name="tel"
            type="tel"
            inputMode="tel"
            defaultValue={phone}
            placeholder="+250788123456"
            required
            className="border-border rounded-control bg-surface text-content mt-1.5 h-11 w-full border px-3 text-base focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="beral-btn-gold rounded-control h-11 self-end px-6 font-semibold"
        >
          Rechercher
        </button>
      </form>

      {hasQuery && !order ? (
        <div className="border-border bg-surface-muted/50 rounded-card mt-8 border border-dashed px-6 py-12 text-center">
          <PackageSearch className="text-content-muted mx-auto h-8 w-8" aria-hidden />
          <p className="text-content mt-3 font-medium">Aucune commande trouvée</p>
          <p className="text-content-muted mx-auto mt-2 max-w-md text-sm">
            Vérifiez le numéro et le téléphone. Le numéro figure dans votre confirmation de
            commande, au format BRL-2026-000123.
          </p>
        </div>
      ) : null}

      {order ? (
        <div className="mt-8">
          <OrderDetail order={order} />
        </div>
      ) : null}
    </main>
  );
}
