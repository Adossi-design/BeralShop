import type { Metadata } from 'next';
import Link from 'next/link';

import { prisma } from '@beralshopp/db';
import { formatMoney, money } from '@beralshopp/shared';

import { DraftNotice, Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Livraison',
  description:
    'Livraison gratuite partout en Afrique, sous 2 semaines. Zones desservies et délais.',
  alternates: { canonical: '/livraison' },
};

export const revalidate = 3600;

/**
 * Page livraison.
 *
 * Les tarifs sont lus EN BASE, jamais écrits en dur : modifier un prix depuis
 * l'administration met cette page à jour. Deux sources de vérité finiraient
 * immanquablement par se contredire — et c'est le client qui le découvrirait.
 */
export default async function ShippingPage() {
  const zones = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      countryCode: true,
      rates: {
        where: { isActive: true },
        orderBy: { priceMinor: 'asc' },
        select: {
          name: true,
          priceMinor: true,
          currency: true,
          freeAboveMinor: true,
          minDeliveryDays: true,
          maxDeliveryDays: true,
        },
      },
    },
  });

  return (
    <StaticPage title="Livraison" intro="Zones desservies, tarifs et délais indicatifs.">
      {zones.length === 0 ? (
        <p className="text-content-muted text-sm">
          Les zones de livraison sont en cours de configuration.
        </p>
      ) : (
        <div className="border-border bg-surface rounded-card overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="bg-surface-muted text-content-muted text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Zone</th>
                  <th className="px-4 py-2.5 text-end font-medium">Tarif</th>
                  <th className="px-4 py-2.5 text-start font-medium">Délai</th>
                  <th className="px-4 py-2.5 text-end font-medium">Offerte dès</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {zones.flatMap((zone) =>
                  zone.rates.map((rate) => (
                    <tr key={`${zone.name}-${rate.name}`}>
                      <td className="px-4 py-3">
                        <span className="text-content block font-medium">{zone.name}</span>
                        <span className="text-content-muted text-xs">{rate.name}</span>
                      </td>
                      <td className="beral-price px-4 py-3 text-end font-semibold">
                        {rate.priceMinor === 0 ? (
                          <span className="text-success-500">Gratuite</span>
                        ) : (
                          <span className="text-content">
                            {formatMoney(money(rate.priceMinor, rate.currency as 'RWF'), 'fr')}
                          </span>
                        )}
                      </td>
                      <td className="text-content-muted px-4 py-3 text-xs">
                        {rate.minDeliveryDays && rate.maxDeliveryDays
                          ? `${rate.minDeliveryDays} à ${rate.maxDeliveryDays} jours`
                          : '—'}
                      </td>
                      <td className="beral-price px-4 py-3 text-end">
                        {rate.freeAboveMinor !== null ? (
                          <span className="text-success-500 font-medium">
                            {formatMoney(money(rate.freeAboveMinor, rate.currency as 'RWF'), 'fr')}
                          </span>
                        ) : (
                          <span className="text-content-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Section title="Combien coûte la livraison ?">
        <p>
          <strong className="text-content">Rien.</strong> La livraison est gratuite partout en
          Afrique, quel que soit le montant de la commande. Le prix affiché sur la fiche produit est
          le prix que vous payez, livraison comprise.
        </p>
      </Section>

      <Section title="Délais">
        <p>
          Votre commande est livrée <strong className="text-content">sous 2 semaines</strong>. Le
          délai court à partir de la{' '}
          <strong className="text-content">confirmation du paiement</strong>, non de la commande.
          Une commande impayée n’est pas préparée.
        </p>
        <p>
          Vous suivez chaque étape depuis la page{' '}
          <Link href="/suivi" className="text-gold-700 underline">
            Suivre ma commande
          </Link>
          . Lorsqu’un transporteur fournit un numéro de suivi, il y apparaît également.
        </p>
      </Section>

      <Section title="Autres pays d’Afrique">
        <p>
          La livraison est gratuite dans toute l’Afrique. La commande en ligne est ouverte au Rwanda
          aujourd’hui et s’ouvre progressivement aux autres pays. En attendant, si vous commandez
          depuis un autre pays,{' '}
          <Link href="/contact" className="text-gold-700 underline">
            écrivez-nous
          </Link>{' '}
          : nous organisons la livraison avec vous.
        </p>
      </Section>

      <DraftNotice>
        Les tarifs et délais ci-dessus proviennent directement du paramétrage de la boutique.
        Vérifiez-les avec votre transporteur avant l’ouverture commerciale.
      </DraftNotice>
    </StaticPage>
  );
}
