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
 *
 * PAS DE `flex-1` : le cadre épouse son contenu et ne se contraint que s'il
 * déborde. Avec `flex-1`, une liste d'une seule commande étirait un cadre vide
 * sur toute la hauteur de l'écran — un tableau qui a l'air amputé. Le retrait
 * fonctionne parce que `min-h-0` autorise le rétrécissement en dessous du
 * contenu, et que le bandeau, lui, porte `shrink-0`.
 */
export function ConsoleTableau({ children }: { readonly children: ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-card mt-6 overflow-auto border lg:min-h-0">
      {children}
    </div>
  );
}

/* ═══════════════════════════ Tableaux ═══════════════════════════ */

/**
 * En-tête de tableau : sombre, comme la barre latérale.
 *
 * Le gris clair d'origine sur fond blanc ne se distinguait presque pas des
 * lignes de données : l'œil ne trouvait pas où commençait le tableau, et une
 * fois l'en-tête figé en haut du cadre, rien ne disait qu'il s'agissait d'un
 * repère et non d'une ligne comme les autres.
 *
 * Le fond sombre et les libellés dorés reprennent exactement la barre latérale.
 * Aucune couleur nouvelle : ce sont les deux teintes déjà portées par l'espace
 * d'administration, et elles disent la même chose ici — ceci est le cadre, pas
 * la donnée.
 */
export function ConsoleThead({
  children,
  fixe = true,
}: {
  readonly children: ReactNode;
  /** À laisser à `false` quand le cadre n'est pas une zone de défilement : un
      `sticky` sans zone de défilement ne fait rien, autant ne pas le poser. */
  readonly fixe?: boolean;
}) {
  return (
    <thead
      className={`beral-surface-brand text-gold-300 text-[0.7rem] tracking-wider uppercase ${
        fixe ? 'sticky top-0 z-10' : ''
      }`}
    >
      {children}
    </thead>
  );
}

export function ConsoleTh({
  children,
  fin = false,
}: {
  readonly children?: ReactNode;
  /** Colonne de chiffres : alignée à droite, comme les valeurs qu'elle coiffe. */
  readonly fin?: boolean;
}) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${fin ? 'text-end' : 'text-start'}`}>{children}</th>
  );
}

/**
 * Ligne de tableau : alternance discrète, survol doré.
 *
 * Les lignes tiennent sur deux niveaux — un nom, puis sa référence en petit.
 * Sans alternance, l'œil ne sait plus, au milieu du tableau, quel prix va avec
 * quel produit ; c'est le genre d'erreur de lecture qui se paie en stock.
 *
 * LE SURVOL EST POSÉ SUR LES CELLULES, ET NON SUR LA LIGNE. `even:` et `hover:`
 * ont la même spécificité CSS : lequel l'emporte dépendrait de l'ordre où
 * Tailwind les écrit, et le survol d'une ligne paire pourrait ne rien faire.
 * Le fond d'une cellule se peint par-dessus celui de sa ligne — la question ne
 * se pose plus.
 */
export const LIGNE_CONSOLE =
  'even:bg-surface-muted [&:hover>td]:bg-gold-50 [&>td]:transition-colors';
