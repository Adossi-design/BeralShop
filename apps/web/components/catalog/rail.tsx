'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Conteneur défilant d'un carrousel, avec flèches gauche/droite.
 *
 * À la souris, un défilement horizontal n'est pas naturel (il faut Maj+molette,
 * que presque personne ne connaît) : sans flèches, les produits hors écran
 * n'existent tout simplement pas pour une bonne partie des visiteurs de bureau.
 * Sur téléphone, le glissement au doigt est le geste attendu — les flèches
 * n'apparaissent donc qu'à partir des écrans moyens.
 *
 * Composant client minimal : les cartes restent rendues côté serveur et arrivent
 * ici via `children`. Seuls les deux boutons embarquent du JavaScript.
 */
export function Rail({ children }: { readonly children: React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    // 90 % de la largeur visible : la dernière carte à moitié visible avant le
    // clic reste à l'écran après, ce qui donne un repère de continuité.
    list.scrollBy({ left: direction * list.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <ul
        ref={listRef}
        className="-mx-1 flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      <button
        type="button"
        aria-label="Produits précédents"
        onClick={() => scrollBy(-1)}
        className="border-border bg-surface text-content shadow-raised hover:border-gold-400 absolute top-[38%] -left-3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition-colors md:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Produits suivants"
        onClick={() => scrollBy(1)}
        className="border-border bg-surface text-content shadow-raised hover:border-gold-400 absolute top-[38%] -right-3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition-colors md:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
