'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { ProductImageView } from '@beralshopp/core';

import { ProductImage } from './product-image';

/**
 * Galerie d'une fiche produit.
 *
 * CE QU'ELLE REMPLACE
 * La fiche montrait UNE photo, puis cinq vignettes qui ne réagissaient à aucun
 * clic. Les produits de la boutique en comptent onze à quatorze : neuf photos
 * sur dix étaient donc payées, stockées, servies au navigateur — et invisibles.
 * Sur un article vendu à distance, ce sont exactement les vues qui décident
 * l'achat : le dos, la prise, l'échelle dans une main.
 *
 * COMMENT ELLE DÉFILE
 * Par `scroll-snap` du navigateur, pas par une bibliothèque de carrousel. Le
 * glissement du doigt, l'inertie, le rebond en fin de course et la molette
 * horizontale sont alors ceux du système : rien à réimplémenter, rien qui se
 * décale sur un téléphone d'entrée de gamme. Le composant n'ajoute que la
 * lecture de la position et les commandes pour s'y déplacer.
 *
 * `scrollTo` est enveloppé dans un `try` : `behavior: 'smooth'` n'est pas
 * universel, et son absence ne doit pas empêcher le déplacement.
 */

export function ProductGallery({
  images,
  name,
}: {
  readonly images: readonly ProductImageView[];
  readonly name: string;
}) {
  const piste = useRef<HTMLUListElement>(null);
  const [courante, setCourante] = useState(0);

  /* La position vient du défilement lui-même, jamais d'un état qu'on
     maintiendrait en parallèle : le doigt peut s'arrêter entre deux photos, et
     seul le conteneur sait où il en est. */
  const relirePosition = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    const largeur = el.clientWidth || 1;
    setCourante(Math.round(el.scrollLeft / largeur));
  }, []);

  useEffect(() => {
    const el = piste.current;
    if (!el) return undefined;
    el.addEventListener('scroll', relirePosition, { passive: true });
    return () => el.removeEventListener('scroll', relirePosition);
  }, [relirePosition]);

  const allerA = useCallback((index: number) => {
    const el = piste.current;
    if (!el) return;
    const cible = Math.max(0, index) * el.clientWidth;
    try {
      el.scrollTo({ left: cible, behavior: 'smooth' });
    } catch {
      el.scrollLeft = cible;
    }
  }, []);

  if (images.length === 0) {
    return (
      <div className="bg-surface-muted border-border rounded-card relative aspect-square overflow-hidden border">
        <ProductImage image={null} name={name} sizes="(max-width: 1024px) 100vw, 45vw" priority />
      </div>
    );
  }

  const unique = images.length === 1;

  return (
    <div className="w-full min-w-0">
      <div className="group relative w-full">
        <ul
          ref={piste}
          /* `aria-roledescription` dit ce que c'est ; `tabIndex` rend la zone
             atteignable au clavier, où les flèches gauche/droite défilent
             nativement dans un conteneur défilant. */
          aria-roledescription="galerie"
          aria-label={`Photos de ${name}`}
          tabIndex={0}
          className="rounded-card border-border bg-surface-muted flex w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto border focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-scrollbar]:hidden"
        >
          {/* `basis-full` plutôt que `w-full` seul : dans une rangée flexible,
              une largeur en pourcentage se résout contre une largeur de parent
              qui dépend elle-même du contenu — un raisonnement circulaire dont
              les navigateurs sortent en prenant beaucoup trop large. La base
              flexible, elle, se résout contre la ligne. */}
          {images.map((image, index) => (
            <li
              key={image.url}
              className="relative aspect-square w-full shrink-0 basis-full snap-center"
            >
              <ProductImage
                image={image}
                name={index === 0 ? name : `${name} — vue ${index + 1}`}
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority={index === 0}
              />
            </li>
          ))}
        </ul>

        {!unique ? (
          <>
            {/* Compteur : sur douze photos, les pastilles seules ne disent plus
                combien il en reste. */}
            <span className="bg-ink-900/70 beral-price pointer-events-none absolute end-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white">
              {courante + 1} / {images.length}
            </span>

            {/* Flèches réservées au pointeur : sur un écran tactile, le doigt
                fait déjà le travail et deux boutons de plus recouvriraient la
                photo. */}
            <button
              type="button"
              onClick={() => allerA(courante - 1)}
              disabled={courante === 0}
              aria-label="Photo précédente"
              className="bg-surface/90 text-content hover:bg-surface rounded-control absolute start-2 top-1/2 hidden -translate-y-1/2 p-2 opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 lg:block"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => allerA(courante + 1)}
              disabled={courante >= images.length - 1}
              aria-label="Photo suivante"
              className="bg-surface/90 text-content hover:bg-surface rounded-control absolute end-2 top-1/2 hidden -translate-y-1/2 p-2 opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-0 lg:block"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {!unique ? (
        <>
          {/* Pastilles de position, à portée du pouce sous la photo. */}
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => allerA(index)}
                aria-label={`Aller à la photo ${index + 1}`}
                aria-current={index === courante ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  index === courante ? 'bg-gold-500 w-5' : 'bg-border hover:bg-gold-300 w-1.5'
                }`}
              />
            ))}
          </div>

          {/* TOUTES les vignettes, et non plus les cinq premières : elles
              défilent horizontalement plutôt que d'être tronquées. Celle qui est
              affichée porte un cadre doré, sinon on ne sait plus où l'on est. */}
          <ul className="mt-3 flex [scrollbar-width:thin] gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <li key={image.url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => allerA(index)}
                  aria-label={`Voir la photo ${index + 1}`}
                  aria-current={index === courante ? 'true' : undefined}
                  className={`bg-surface-muted relative block aspect-square w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                    index === courante ? 'border-gold-400' : 'border-border hover:border-gold-300'
                  }`}
                >
                  <ProductImage image={image} name={`${name} — vue ${index + 1}`} sizes="64px" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
