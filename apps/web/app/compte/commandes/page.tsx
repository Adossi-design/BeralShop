import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mes commandes',
  robots: { index: false, follow: false },
};

/**
 * Historique des commandes.
 *
 * Volontairement vide : les commandes arrivent au lot 5. La page existe dès
 * maintenant pour que la navigation de l'espace client soit complète — un lien qui
 * mène à une erreur 404 inquiète bien plus qu'une page qui annonce ce qui vient.
 */
export default function OrdersPage() {
  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Mes commandes</h1>

      <div className="border-border bg-surface-muted/50 rounded-card mt-6 border border-dashed px-6 py-14 text-center">
        <PackageOpen className="text-content-muted mx-auto h-8 w-8" aria-hidden />
        <p className="text-content mt-3 font-medium">Aucune commande pour le moment</p>
        <p className="text-content-muted mt-1 text-sm">
          Vos commandes apparaîtront ici, avec leur suivi étape par étape.
        </p>
        <Link
          href="/categories"
          className="beral-btn-gold rounded-control mt-5 inline-block px-6 py-2.5 text-sm font-semibold"
        >
          Découvrir les produits
        </Link>
      </div>
    </>
  );
}
