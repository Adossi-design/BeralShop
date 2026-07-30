/**
 * Marque Beralshop.
 *
 * Le monogramme est un « B » construit sur un sac de courses stylisé : lisible à
 * 24 px comme à 200 px, reconnaissable en une couleur, et fonctionnel en favicon.
 * Rendu en SVG inline — aucun fichier image à télécharger, donc aucun impact sur
 * le temps d'affichage de l'en-tête.
 */
export function BeralshopMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="Beralshop" className={className} fill="none">
      {/* Corps du sac */}
      <path
        d="M7 13.5h26l-2.4 20.2a4 4 0 0 1-4 3.55H13.4a4 4 0 0 1-4-3.55L7 13.5Z"
        className="fill-brand-600"
      />
      {/* Anse */}
      <path
        d="M14.5 15.5V11a5.5 5.5 0 0 1 11 0v4.5"
        className="stroke-accent-400"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* « B » évidé dans le sac */}
      <path
        d="M16.6 20h5.2c2.3 0 3.8 1.15 3.8 3.05 0 1.25-.66 2.2-1.76 2.62 1.4.36 2.26 1.42 2.26 2.94 0 2.1-1.62 3.39-4.18 3.39H16.6V20Zm4.75 4.9c1.03 0 1.63-.5 1.63-1.38 0-.87-.6-1.36-1.63-1.36h-2.2v2.74h2.2Zm.3 5c1.13 0 1.78-.53 1.78-1.47 0-.93-.65-1.45-1.79-1.45h-2.49v2.92h2.5Z"
        className="fill-white"
      />
    </svg>
  );
}

export function BeralshopLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BeralshopMark className="h-8 w-8 shrink-0" />
      <span className="text-content text-xl font-bold tracking-tight">
        Beral<span className="text-brand-600">shop</span>
      </span>
    </span>
  );
}
