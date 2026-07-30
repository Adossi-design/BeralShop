import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
};

/**
 * Page 404.
 *
 * Elle propose une SORTIE plutôt qu'une excuse : une recherche et les rubriques
 * principales. Un visiteur qui atterrit ici depuis Google a une intention d'achat ;
 * lui afficher « erreur 404 » et rien d'autre, c'est le perdre.
 */
export default function NotFound() {
  return (
    <main id="contenu" className="beral-container flex flex-1 items-center py-16">
      <div className="mx-auto max-w-lg text-center">
        <Compass className="text-gold-500 mx-auto h-12 w-12" aria-hidden />

        <h1 className="text-content mt-6 text-2xl font-bold sm:text-3xl">Page introuvable</h1>
        <p className="text-content-muted mt-2">
          Cette page n’existe pas ou a été déplacée. Le produit que vous cherchez est peut-être
          ailleurs.
        </p>

        <form action="/recherche" role="search" className="mt-8">
          <label htmlFor="recherche-404" className="sr-only">
            Rechercher un produit
          </label>
          <div className="relative">
            <Search
              className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5"
              aria-hidden
            />
            <input
              id="recherche-404"
              type="search"
              name="q"
              placeholder="Rechercher un produit…"
              className="border-border bg-surface text-content rounded-control h-12 w-full border ps-11 pe-3 text-base focus:outline-none"
            />
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="beral-btn-gold rounded-control px-6 py-2.5 font-semibold">
            Retour à l’accueil
          </Link>
          <Link
            href="/categories"
            className="border-border text-content hover:border-gold-400 rounded-control border px-6 py-2.5 font-medium transition-colors"
          >
            Toutes les catégories
          </Link>
          <Link
            href="/suivi"
            className="border-border text-content hover:border-gold-400 rounded-control border px-6 py-2.5 font-medium transition-colors"
          >
            Suivre ma commande
          </Link>
        </div>
      </div>
    </main>
  );
}
