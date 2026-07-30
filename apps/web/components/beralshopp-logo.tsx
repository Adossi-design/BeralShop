/**
 * Marque Beralshopp.
 *
 * Reprise du monogramme du logo : sac de courses doré avec un cœur évidé.
 * Redessiné en SVG plutôt que réutilisé en image, pour trois raisons :
 *   • net à toute taille, du favicon 16 px à l'écran de démarrage mobile ;
 *   • quelques centaines d'octets au lieu de plusieurs dizaines de kilooctets ;
 *   • fonctionne sur fond clair comme sur fond sombre, alors que le logo fourni
 *     est incrusté sur noir et ferait un rectangle noir sur une page claire.
 *
 * Deux aplats d'or plutôt qu'un dégradé : à la taille réelle d'affichage (36 px),
 * un dégradé SVG n'est pas perceptible, et un dégradé impose un identifiant unique
 * par instance — complexité inutile pour un gain nul.
 *
 * ⚠️ Le logo complet (couronne de feuillages, étoiles, calligraphie) reste la
 * référence pour l'impression, les réseaux sociaux et les emballages. Cette version
 * en est la réduction pour l'écran. Dès que le fichier vectoriel d'origine sera
 * fourni, il pourra le remplacer ici.
 */

/** Or champagne clair — reflet. Correspond à --color-gold-300. */
const GOLD_LIGHT = '#E7C67F';
/** Or profond — corps du sac. Correspond à --color-gold-400. */
const GOLD_DEEP = '#DBAC55';
/** Noir du logo, pour le cœur évidé. */
const INK = '#08080A';

export function BeralshoppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="Beralshopp" className={className} fill="none">
      {/* Anse */}
      <path
        d="M14.6 15.2v-3.9a5.4 5.4 0 0 1 10.8 0v3.9"
        stroke={GOLD_LIGHT}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Corps du sac */}
      <path
        d="M8.2 14.6h23.6l-2.1 19.1a3.6 3.6 0 0 1-3.6 3.2H13.9a3.6 3.6 0 0 1-3.6-3.2L8.2 14.6Z"
        fill={GOLD_DEEP}
      />

      {/* Reflet sur le flanc gauche : suffit à suggérer le métal. */}
      <path d="M8.2 14.6h4.6l-1.6 22.3h-.9L8.2 14.6Z" fill={GOLD_LIGHT} opacity="0.55" />

      {/* Cœur évidé — l'élément signature du logo */}
      <path
        d="M20 30.4c-3.4-2.4-5.6-4.3-5.6-6.8a3 3 0 0 1 5.6-1.6 3 3 0 0 1 5.6 1.6c0 2.5-2.2 4.4-5.6 6.8Z"
        fill={INK}
      />
    </svg>
  );
}

/**
 * Marque + nom.
 *
 * `onDark` bascule le nom en or dégradé pour les fonds sombres (en-tête, pied de
 * page) et en noir graphite ailleurs. Le mot est en calligraphie, comme le logo,
 * mais uniquement ici : une cursive dans du texte courant serait illisible.
 */
export function BeralshoppLogo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BeralshoppMark className="h-9 w-9 shrink-0" />
      <span
        className={`font-script pt-1 text-2xl leading-none ${
          onDark ? 'beral-text-gold' : 'text-content'
        }`}
      >
        Beralshopp
      </span>
    </span>
  );
}
