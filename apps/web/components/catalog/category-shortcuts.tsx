import Link from 'next/link';

import type { CategoryNode } from '@beralshopp/core';

import { CategoryIcon } from './category-icon';

/**
 * Accès rapide aux rubriques, en pastilles rondes.
 *
 * Reprend le motif des applications marchandes : une grille d'icônes juste sous
 * la recherche, avant tout produit. Sur un téléphone, une pastille se vise au
 * pouce et se reconnaît d'un coup d'œil, là où une liste de mots demande d'être
 * lue puis pointée.
 *
 * ⚠️ N'affiche QUE les rubriques réelles de la boutique. Aucune entrée inventée
 * du type « Ventes flash » ou « Bonnes affaires » : ces sections n'existent pas
 * ici, et une pastille qui mène à une page vide déçoit plus qu'elle n'attire.
 *
 * Huit rubriques sur téléphone — deux rangées de quatre. Au-delà, les pastilles
 * deviennent trop petites pour être visées ; la barre de catégories de l'en-tête
 * et la page « Toutes les catégories » donnent accès au reste.
 */

const MAX_TELEPHONE = 8;

export function CategoryShortcuts({
  categories,
}: {
  readonly categories: readonly CategoryNode[];
}) {
  if (categories.length === 0) return null;

  const visibles = categories.slice(0, 12);

  return (
    <nav aria-label="Accès rapide aux rubriques" className="beral-container py-4">
      <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-12">
        {visibles.map((category, index) => (
          <li
            key={category.slug}
            /* Au-delà de huit, les pastilles ne s'affichent qu'à partir des
               écrans où elles restent assez larges pour être visées au doigt. */
            className={index >= MAX_TELEPHONE ? 'hidden sm:block' : undefined}
          >
            <Link
              href={`/categories/${category.slug}`}
              className="group flex flex-col items-center gap-1.5 text-center"
            >
              <span className="border-gold-200 bg-gold-50 text-gold-700 group-hover:border-gold-400 group-hover:bg-gold-100 flex h-14 w-14 items-center justify-center rounded-full border transition-colors">
                <CategoryIcon name={category.iconName} className="h-6 w-6" />
              </span>
              {/* Deux lignes au maximum : les noms longs comme « Bureau et
                  Fournitures scolaires » déformeraient sinon la grille. */}
              <span className="text-content-muted group-hover:text-gold-700 line-clamp-2 text-[0.7rem] leading-tight transition-colors">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
