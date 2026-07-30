import Link from 'next/link';
import { listCategoryTree } from '@beralshopp/core';

import { BeralshoppLogo, BeralshoppMark } from './beralshopp-logo';
import { HeaderAccount } from './header-account';
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
 * Composant SERVEUR, et sans lecture de cookie : c'est ce qui permet aux pages du
 * site de rester pré-rendues. Le compte et le panier, qui dépendent du visiteur,
 * sont confiés à <HeaderAccount>, un composant client. Lire la session ici rendrait
 * toutes les pages dynamiques et supprimerait toute mise en cache.
 */
export async function SiteHeader() {
  const categories = await listCategoryTree();

  return (
    <header className="beral-surface-brand sticky top-0 z-40">
      <div className="beral-container">
        {/* ——— Ligne principale ——— */}
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="shrink-0" aria-label="Beralshopp, accueil">
            {/*
              La visibilité est portée par un <span> enveloppant, PAS par le logo
              lui-même : le composant fixe son propre `inline-flex`, qui entrerait
              en conflit avec un `hidden` ajouté ici — deux utilitaires de display
              de même spécificité, et c'est l'ordre de la feuille de style qui
              tranche. Résultat observé : les deux logos affichés en même temps.
            */}
            <span className="hidden sm:block">
              <BeralshoppLogo onDark />
            </span>
            <BeralshoppMark className="h-9 w-9 sm:hidden" />
          </Link>

          {/* Recherche — masquée ici sur mobile, affichée en pleine largeur en dessous */}
          <div className="hidden flex-1 md:block">
            <SearchBox variant="desktop" />
          </div>

          <HeaderAccount />
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
