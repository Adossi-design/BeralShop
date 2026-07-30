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

const PLACEHOLDER_GRADIENTS = [
  'from-gold-100 to-gold-200 text-gold-700',
  'from-gold-100 to-gold-200 text-gold-800',
  'from-ink-100 to-ink-200 text-ink-600',
  'from-gold-50 to-gold-100 text-gold-700',
  'from-gold-50 to-gold-100 text-gold-800',
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
        className={`object-cover ${className ?? ''}`}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      // aria-hidden : l'information est déjà portée par le nom du produit juste à côté.
      // Un lecteur d'écran n'a pas besoin d'entendre « image manquante ».
      aria-hidden
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(name)} ${className ?? ''}`}
    >
      <span className="flex flex-col items-center gap-1">
        <span className="text-3xl font-bold opacity-70 sm:text-4xl">{initial}</span>
        <ImageIcon className="h-4 w-4 opacity-40" />
      </span>
    </div>
  );
}
