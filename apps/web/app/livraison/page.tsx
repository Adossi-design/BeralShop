import type { Metadata } from 'next';
import Link from 'next/link';

import { prisma } from '@beralshopp/db';
import { formatMoney, money } from '@beralshopp/shared';

import { DraftNotice, Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Livraison',
  description:
    'Zones, tarifs et délais de livraison Beralshopp au Rwanda. Livraison offerte ' +
    'au-delà d’un certain montant.',
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
                      <td className="beral-price text-content px-4 py-3 text-end font-semibold">
                        {formatMoney(money(rate.priceMinor, rate.currency as 'RWF'), 'fr')}
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

      <Section title="Comment le tarif est calculé">
        <p>
          Le montant dépend de la <strong className="text-content">province</strong> indiquée dans
          votre adresse de livraison. Le panier affiche une estimation basée sur le tarif le plus
          bas ; le montant définitif apparaît au moment de la commande, une fois l’adresse
          renseignée.
        </p>
        <p>
          Lorsque votre commande dépasse le seuil indiqué ci-dessus, la livraison devient gratuite
          automatiquement — rien à faire.
        </p>
      </Section>

      <Section title="Délais">
        <p>
          Les délais sont indicatifs et courent à partir de la{' '}
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

      <Section title="Zones non desservies">
        <p>
          Beralshopp livre actuellement au Rwanda. L’ouverture à d’autres pays d’Afrique est prévue.
          Si votre région n’apparaît pas, contactez-nous : certaines livraisons peuvent être
          organisées au cas par cas.
        </p>
      </Section>

      <DraftNotice>
        Les tarifs et délais ci-dessus proviennent directement du paramétrage de la boutique.
        Vérifiez-les avec votre transporteur avant l’ouverture commerciale.
      </DraftNotice>
    </StaticPage>
  );
}
