'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Retour vers l'accueil du compte, sur téléphone et tablette.
 *
 * Sous 1024 px, le menu latéral de l'espace client est masqué : la page
 * « Mon compte » tient ce rôle, comme dans les applications marchandes. Sans ce
 * lien, une fois entré dans « Mes adresses » on ne pouvait plus revenir qu'en
 * passant par la barre du bas — deux gestes au lieu d'un, et rien à l'écran qui
 * dise comment sortir.
 *
 * Il disparaît sur l'accueil du compte, où il ne mènerait nulle part, et à
 * partir de 1024 px, où le menu latéral est visible en permanence.
 */
export function RetourCompte() {
  const pathname = usePathname();
  if (pathname === '/compte') return null;

  return (
    <Link
      href="/compte"
      className="text-content-muted hover:text-gold-700 mb-3 inline-flex items-center gap-1 text-sm transition-colors lg:hidden"
    >
      <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      Mon compte
    </Link>
  );
}
