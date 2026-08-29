import Image from 'next/image';
import Link from 'next/link';
import { listCategoryTree } from '@beralshopp/core';

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
        {/* Sous `lg`, la hauteur suit le logo : il y est seul, centré, et occupe
            l'essentiel de la largeur pour que le motif se voie dès l'arrivée.
            À partir de `lg`, la ligne reprend une hauteur fixe puisque le logo y
            partage la place avec la recherche et le compte. */}
        <div className="flex items-center gap-3 py-3 lg:h-20 lg:py-0">
          {/*
            `mx-auto` centre le logo tant qu'il est seul sur la ligne — c'est le
            cas sous 1024 px, depuis que les boutons d'action sont partis dans la
            barre basse. À partir de `lg`, la recherche et le compte reprennent
            leur place et le logo revient à gauche : le centrer là déplacerait la
            barre de recherche, qui est l'outil le plus utilisé d'une boutique.
          */}
          <Link href="/" className="mx-auto shrink-0 lg:mx-0" aria-label="Beralshopp, accueil">
            {/*
              Le logo réel de la boutique, détouré sur fond transparent. Le
              fichier d'origine est un JPEG à fond gris foncé : posé tel quel sur
              l'en-tête noir, il y dessinait un carré visible.

              `priority` : c'est le premier élément visible de chaque page, il ne
              doit pas apparaître après le reste.
            */}
            <Image
              src="/images/logo-beralshopp.png"
              alt="Beralshopp"
              width={1188}
              height={881}
              priority
              className="h-auto w-70 max-w-full lg:h-16 lg:w-auto"
            />
          </Link>

          {/* Recherche en ligne uniquement à partir de 1024 px. En dessous, elle passe
              sous le logo : le logo y est grand et centré, et la coincer à côté le
              décalerait sur le bord. */}
          <div className="hidden flex-1 lg:block">
            <SearchBox variant="desktop" />
          </div>

          {/* Catégories, compte et panier ne sont plus ici sous 1024 px : ils
              figurent à l'identique dans la barre de navigation basse, à portée
              du pouce. Les afficher aux deux endroits dupliquait les mêmes
              actions et encombrait l'en-tête. */}
          <div className="ms-auto hidden lg:block">
            <HeaderAccount />
          </div>
        </div>

        {/* ——— Recherche mobile, toujours visible ——— */}
        <div className="pb-3 lg:hidden">
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
