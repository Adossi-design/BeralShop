import Link from 'next/link';
import { LayoutGrid, ShoppingCart, User } from 'lucide-react';

import { listCategoryTree } from '@beralshopp/core';

import { BeralshoppLogo, BeralshoppMark } from './beralshopp-logo';
import { SearchBox } from './search-box';

/**
 * En-tête du site.
 *
 * Fond noir et accents or : c'est ici que l'identité du logo s'impose, avant que la
 * boutique ne passe sur fond clair pour laisser les produits respirer.
 *
 * Conception mobile d'abord : la majorité des clients arrivent depuis un téléphone.
 * La barre de recherche occupe toute la largeur sur mobile et reste visible en
 * permanence — c'est le point d'entrée n°1 vers l'achat, jamais un élément replié
 * derrière une icône.
 *
 * Composant serveur : les catégories viennent de la base, sans aucun JavaScript
 * envoyé au navigateur pour les afficher.
 */
export async function SiteHeader() {
  const categories = await listCategoryTree();

  return (
    <header className="beral-surface-brand sticky top-0 z-40">
      <div className="beral-container">
        {/* ——— Ligne principale ——— */}
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="shrink-0" aria-label="Beralshopp, accueil">
            <BeralshoppLogo className="hidden sm:inline-flex" onDark />
            <BeralshoppMark className="h-9 w-9 sm:hidden" />
          </Link>

          {/* Recherche — masquée ici sur mobile, affichée en pleine largeur en dessous */}
          <div className="hidden flex-1 md:block">
            <SearchBox variant="desktop" />
          </div>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <Link
              href="/categories"
              className="text-ink-100 hover:bg-ink-800 hover:text-gold-300 rounded-control flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3 lg:hidden"
              aria-label="Toutes les catégories"
            >
              <LayoutGrid className="h-5 w-5" aria-hidden />
            </Link>

            <Link
              href="/compte"
              className="text-ink-100 hover:bg-ink-800 hover:text-gold-300 rounded-control flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3"
            >
              <User className="h-5 w-5" aria-hidden />
              <span className="hidden lg:inline">Mon compte</span>
            </Link>

            <Link
              href="/panier"
              className="text-ink-100 hover:bg-ink-800 hover:text-gold-300 rounded-control relative flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden />
              <span className="hidden lg:inline">Panier</span>
            </Link>
          </div>
        </div>

        {/* ——— Recherche mobile, toujours visible ——— */}
        <div className="pb-3 md:hidden">
          <SearchBox variant="mobile" />
        </div>
      </div>

      {/* Filet doré : écho du cercle qui entoure le logo. */}
      <div className="beral-rule-gold" aria-hidden />

      {/* ——— Barre des catégories ——— */}
      <nav aria-label="Catégories" className="bg-ink-900">
        <div className="beral-container">
          <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto py-2 text-sm [&::-webkit-scrollbar]:hidden">
            <li>
              <Link
                href="/categories"
                className="text-gold-300 hover:bg-ink-800 block rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors"
              >
                Tout
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="text-ink-300 hover:bg-ink-800 hover:text-gold-200 block rounded-full px-3 py-1.5 whitespace-nowrap transition-colors"
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
