import type { Metadata } from 'next';
import { MapPinPlus } from 'lucide-react';

import { prisma } from '@beralshopp/db';

import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mes adresses',
  robots: { index: false, follow: false },
};

/**
 * Carnet d'adresses.
 *
 * La saisie complète arrive au lot 5, avec le tunnel de commande : le formulaire
 * d'adresse y est indissociable du choix de livraison, et le construire deux fois
 * n'aurait aucun sens. Cette page affiche déjà les adresses existantes.
 */
export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefaultShipping: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Mes adresses</h1>
      <p className="text-content-muted mt-1 text-sm">
        Vos adresses de livraison, pour commander sans tout ressaisir.
      </p>

      {addresses.length === 0 ? (
        <div className="border-border bg-surface-muted/50 rounded-card mt-6 border border-dashed px-6 py-14 text-center">
          <MapPinPlus className="text-content-muted mx-auto h-8 w-8" aria-hidden />
          <p className="text-content mt-3 font-medium">Aucune adresse enregistrée</p>
          <p className="text-content-muted mx-auto mt-1 max-w-sm text-sm">
            Vous pourrez enregistrer une adresse lors de votre première commande.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="border-border bg-surface rounded-card border p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-content font-semibold">{address.recipientName}</p>
                {address.isDefaultShipping ? (
                  <span className="bg-gold-100 text-gold-800 rounded px-2 py-0.5 text-[0.65rem] font-semibold">
                    Par défaut
                  </span>
                ) : null}
              </div>
              <p className="text-content-muted beral-price mt-1">{address.phone}</p>
              <p className="text-content-muted mt-2">
                {[
                  address.village,
                  address.cell,
                  address.sector,
                  address.district,
                  address.province,
                  address.neighbourhood,
                  address.streetLine,
                  address.city,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {address.landmark ? (
                <p className="text-content-muted mt-1 text-xs">Repère : {address.landmark}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
