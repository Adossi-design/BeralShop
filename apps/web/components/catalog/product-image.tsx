import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import type { ProductImageView } from '@beralshopp/core';

/**
 * Visuel produit, avec substitut lorsqu'aucune photo n'est encore chargée.
 *
 * Le substitut n'est pas un carré gris : il génère un dégradé stable à partir du nom
 * du produit et affiche son initiale. Une grille de catalogue sans photos reste ainsi
 * lisible et distinguable, ce qui compte tant que le vrai catalogue photo n'est pas là.
 *
 * Le dégradé est déterministe : le même produit garde toujours la même couleur, y
 * compris entre le rendu serveur et le navigateur — sinon React signalerait une
 * incohérence d'hydratation.
 */

/**
 * Six teintes distinctes définies dans globals.css.
 * Leur diversité est fonctionnelle : dans une grille sans photos, c'est le seul
 * repère qui distingue une vignette de sa voisine.
 */
const PLACEHOLDER_GRADIENTS = [
  'beral-ph-1',
  'beral-ph-2',
  'beral-ph-3',
  'beral-ph-4',
  'beral-ph-5',
  'beral-ph-6',
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PLACEHOLDER_GRADIENTS.length;
  return PLACEHOLDER_GRADIENTS[index] ?? PLACEHOLDER_GRADIENTS[0]!;
}

interface ProductImageProps {
  readonly image: ProductImageView | null;
  readonly name: string;
  /** `sizes` doit décrire la largeur réelle affichée, sinon le navigateur télécharge trop grand. */
  readonly sizes: string;
  readonly priority?: boolean;
  readonly className?: string;
}

export function ProductImage({ image, name, sizes, priority, className }: ProductImageProps) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.altText}
        fill
        sizes={sizes}
        priority={priority ?? false}
        /**
         * `object-contain` ET NON `object-cover`.
         *
         * `cover` remplit le cadre en rognant ce qui dépasse. Mesuré sur la
         * boutique : les photos livrées sont carrées, les vignettes de l'accueil
         * étaient en 4/3 — 25 % de chaque photo était coupé, en haut et en bas.
         * Sur une montre, c'est le bracelet ; sur un flacon, c'est le bouchon.
         * Le client ne voit pas ce qu'il achète, et le vendeur ne sait pas ce
         * qui manque.
         *
         * `contain` montre la photo ENTIÈRE. Le cadre étant désormais carré comme
         * les photos, elle l'occupe de bord à bord ; une photo de proportion
         * différente est simplement complétée par le fond, jamais amputée.
         */
        className={`object-contain ${className ?? ''}`}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      // aria-hidden : l'information est déjà portée par le nom du produit juste à côté.
      // Un lecteur d'écran n'a pas besoin d'entendre « image manquante ».
      aria-hidden
      // Pas de `bg-gradient-to-br` ici : ce serait un utilitaire `background-image`,
      // et la couche `utilities` prime sur `components` — il écraserait la teinte.
      className={`flex h-full w-full items-center justify-center ${gradientFor(name)} ${className ?? ''}`}
    >
      <span className="flex flex-col items-center gap-1">
        <span className="text-3xl font-bold opacity-70 sm:text-4xl">{initial}</span>
        <ImageIcon className="h-4 w-4 opacity-40" />
      </span>
    </div>
  );
}
