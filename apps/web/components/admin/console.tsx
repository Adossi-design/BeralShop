import type { ReactNode } from 'react';

/**
 * Découpage d'un écran d'administration : un bandeau qui ne bouge pas, un corps
 * qui défile seul.
 *
 * Sur un poste de pilotage, le titre, la recherche et les filtres sont des
 * COMMANDES, pas du contenu. Les laisser partir vers le haut oblige à remonter
 * cent lignes pour changer de filtre ou relancer une recherche, et l'on perd en
 * chemin le repère de ce que l'on regardait. Seules les données bougent.
 *
 * La mécanique tient en deux pièces, dont la première est posée dans
 * `app/admin/layout.tsx` : `<main>` y devient une colonne flex de la hauteur
 * exacte de l'écran, sans débordement. Le bandeau garde sa taille naturelle, le
 * corps prend tout le reste — et c'est lui, et lui seul, qui défile.
 *
 * Tout est conditionné à `lg:` (à partir de 1024 px). En dessous, la page
 * défile normalement : imbriquer une zone de défilement dans une page qui
 * défile déjà casse l'inertie tactile, la restauration de position au retour
 * arrière, et le geste de balayage vers le bas.
 */

/** Bandeau figé : titre, compteur, recherche, filtres. */
export function ConsoleEnTete({ children }: { readonly children: ReactNode }) {
  return <div className="lg:shrink-0">{children}</div>;
}

/**
 * Corps défilant des écrans faits de PLUSIEURS blocs.
 *
 * `min-h-0` est indispensable et contre-intuitif : un élément flex refuse par
 * défaut de devenir plus court que son contenu. Sans lui la zone s'étire au
 * lieu de défiler, et le bandeau est repoussé hors de l'écran — soit
 * exactement ce que l'on cherchait à empêcher.
 *
 * Les marges négatives ramènent la barre de défilement au bord du panneau
 * plutôt qu'à 24 px de là, où elle flotterait sans toucher à rien.
 */
export function ConsoleCorps({ children }: { readonly children: ReactNode }) {
  return <div className="lg:-mx-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6">{children}</div>;
}

/**
 * Corps défilant des écrans qui ne montrent QU'UN tableau : le cadre devient
 * lui-même la zone de défilement, ce qui permet d'y fixer l'en-tête des
 * colonnes (`<thead className="sticky top-0">`) — sans quoi on finit par lire
 * une colonne de nombres sans savoir laquelle.
 *
 * Un seul élément prend les deux axes, et c'est la clé : une barre horizontale
 * posée sur un `<div>` intérieur, comme c'était le cas avant, en fait une zone
 * de défilement à part entière. L'en-tête des colonnes s'y colle alors — à une
 * boîte qui ne défile jamais verticalement — et ne bouge donc pas d'un pixel.
 * D'où la fusion des deux `<div>` d'origine en un seul.
 *
 * Sur mobile la hauteur reste libre : seul l'axe horizontal défile, comme
 * avant.
 */
export function ConsoleTableau({ children }: { readonly children: ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-card mt-6 overflow-auto border lg:min-h-0 lg:flex-1">
      {children}
    </div>
  );
}
