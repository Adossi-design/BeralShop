import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Fil d'Ariane.
 *
 * Le chevron utilise `rtl:rotate-180` : en arabe, la lecture va de droite à gauche et
 * une flèche pointant à droite indiquerait le mauvais sens. Détail invisible en
 * français, mais indispensable le jour où l'arabe sera activé.
 */
export interface Crumb {
  readonly href: string;
  readonly label: string;
}

export function Breadcrumb({ items }: { readonly items: readonly Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0">
      <ol className="text-content-muted flex flex-wrap items-center gap-1 text-xs sm:text-sm">
        <li className="flex items-center gap-1">
          <Link href="/" className="hover:text-gold-700 inline-flex items-center gap-1">
            <Home className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Accueil</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden />
              {isLast ? (
                <span className="text-content truncate font-medium" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-gold-700 truncate">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
