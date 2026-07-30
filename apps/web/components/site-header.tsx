import Link from 'next/link';
import { Menu, Search, ShoppingCart, User } from 'lucide-react';

import { BeralshopLogo, BeralshopMark } from './beralshop-logo';

/**
 * En-tête du site.
 *
 * Conception mobile d'abord : la majorité des clients arrivent depuis un téléphone.
 * La barre de recherche occupe toute la largeur sur mobile et reste visible en
 * permanence — c'est le point d'entrée n°1 vers l'achat, jamais un élément replié
 * derrière une icône.
 *
 * Les catégories affichées ici seront chargées depuis la base au lot 1.
 */

const PLACEHOLDER_CATEGORIES = [
  { slug: 'electronique', name: 'Électronique' },
  { slug: 'telephonie', name: 'Téléphones' },
  { slug: 'mode', name: 'Mode' },
  { slug: 'maison', name: 'Maison' },
  { slug: 'beaute', name: 'Beauté' },
  { slug: 'informatique', name: 'Informatique' },
  { slug: 'sport', name: 'Sport' },
];

export function SiteHeader() {
  return (
    <header className="border-border bg-surface/95 supports-[backdrop-filter]:bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="beral-container">
        {/* ——— Ligne principale ——— */}
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="rounded-control text-content-muted hover:bg-surface-muted -ms-2 p-2 lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>

          <Link href="/" className="shrink-0" aria-label="Beralshop, accueil">
            <BeralshopLogo className="hidden sm:inline-flex" />
            <BeralshopMark className="h-8 w-8 sm:hidden" />
          </Link>

          {/* Recherche — masquée ici sur mobile, affichée en pleine largeur en dessous */}
          <form action="/recherche" role="search" className="hidden flex-1 md:block">
            <label htmlFor="recherche-bureau" className="sr-only">
              Rechercher un produit
            </label>
            <div className="relative">
              <Search
                className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5"
                aria-hidden
              />
              <input
                id="recherche-bureau"
                type="search"
                name="q"
                placeholder="Rechercher un produit, une marque, une référence…"
                className="rounded-control border-border bg-surface-muted text-content placeholder:text-content-muted focus:border-brand-500 focus:bg-surface h-11 w-full border ps-11 pe-24 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 absolute inset-y-1 end-1 rounded-[0.5rem] px-4 text-sm font-semibold text-white transition-colors"
              >
                Chercher
              </button>
            </div>
          </form>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <Link
              href="/compte"
              className="rounded-control text-content hover:bg-surface-muted flex items-center gap-2 px-2 py-2 text-sm sm:px-3"
            >
              <User className="h-5 w-5" aria-hidden />
              <span className="hidden lg:inline">Mon compte</span>
            </Link>

            <Link
              href="/panier"
              className="rounded-control text-content hover:bg-surface-muted relative flex items-center gap-2 px-2 py-2 text-sm sm:px-3"
            >
              <span className="relative">
                <ShoppingCart className="h-5 w-5" aria-hidden />
                {/* Le compteur sera alimenté par l'état du panier au lot 4. */}
              </span>
              <span className="hidden lg:inline">Panier</span>
            </Link>
          </div>
        </div>

        {/* ——— Recherche mobile, toujours visible ——— */}
        <form action="/recherche" role="search" className="pb-3 md:hidden">
          <label htmlFor="recherche-mobile" className="sr-only">
            Rechercher un produit
          </label>
          <div className="relative">
            <Search
              className="text-content-muted pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5"
              aria-hidden
            />
            <input
              id="recherche-mobile"
              type="search"
              name="q"
              placeholder="Rechercher un produit…"
              className="rounded-control border-border bg-surface-muted text-content placeholder:text-content-muted focus:border-brand-500 focus:bg-surface h-11 w-full border ps-11 pe-3 text-base focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* ——— Barre des catégories ——— */}
      <nav aria-label="Catégories" className="border-border bg-surface-muted/60 border-t">
        <div className="beral-container">
          <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto py-2 text-sm [&::-webkit-scrollbar]:hidden">
            {PLACEHOLDER_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="text-content-muted hover:bg-surface hover:text-brand-700 block rounded-full px-3 py-1.5 whitespace-nowrap transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
