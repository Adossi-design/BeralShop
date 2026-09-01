'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Lien de navigation qui sait s'il désigne la page ouverte.
 *
 * Sans repère « vous êtes ici », on ouvre l'écran des commandes en croyant être
 * sur celui des produits, et l'on cherche pendant dix secondes pourquoi la
 * liste ne ressemble à rien. Le titre de la page le dit, mais il est en haut :
 * l'œil est dans le menu, à gauche.
 *
 * `aria-current="page"` va avec le fond doré, et non à sa place. La couleur
 * seule ne dit rien à un lecteur d'écran ; l'attribut seul ne dit rien à
 * personne d'autre.
 */

/**
 * Fond doré, texte sombre — le même repère sur tout le site, clair comme
 * sombre. L'or est déjà la couleur d'accent de la boutique, et il ne sert nulle
 * part ailleurs à remplir un fond : aucune ambiguïté possible avec un bouton
 * d'action.
 */
export const FOND_ACTIF = 'bg-gold-400 text-ink-950 font-semibold';

/**
 * Les classes de survol de l'état inactif REMPLACENT celles de l'état actif,
 * au lieu de s'y ajouter. Un `hover:bg-ink-800` conservé l'emporterait sur
 * `bg-gold-400` — une pseudo-classe est plus spécifique — et le repère
 * disparaîtrait précisément au moment où l'on pointe dessus.
 */
const INACTIF = {
  sombre: 'text-ink-200 hover:bg-ink-800 hover:text-gold-300',
  clair: 'text-content hover:bg-surface-muted hover:text-gold-700',
} as const;

/**
 * `exact` sert aux racines de section.
 *
 * `/admin` est le préfixe de toutes les pages d'administration : sans lui,
 * « Tableau de bord » resterait allumé quel que soit l'écran ouvert, et deux
 * entrées du menu s'afficheraient comme courantes en même temps.
 */
export function estPageCourante(pathname: string, href: string, exact = false): boolean {
  if (pathname === href) return true;
  if (exact) return false;
  return pathname.startsWith(`${href}/`);
}

export function LienActif({
  href,
  base,
  variante,
  exact = false,
  children,
}: {
  readonly href: string;
  /** Classes de mise en forme communes aux deux états. */
  readonly base: string;
  /** Teinte du fond sur lequel le lien est posé. */
  readonly variante: keyof typeof INACTIF;
  readonly exact?: boolean;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const actif = estPageCourante(pathname, href, exact);

  return (
    <Link
      href={href}
      aria-current={actif ? 'page' : undefined}
      className={`${base} ${actif ? FOND_ACTIF : INACTIF[variante]}`}
    >
      {children}
    </Link>
  );
}
