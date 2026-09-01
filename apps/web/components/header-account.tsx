'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FOND_ACTIF, estPageCourante } from '@/components/lien-actif';
import { LayoutGrid, ShieldCheck, ShoppingCart, User } from 'lucide-react';

/**
 * Compte et panier dans l'en-tête.
 *
 * Composant CLIENT, et c'est délibéré : lire le cookie de session côté serveur
 * rendait toutes les pages du site dynamiques, supprimant toute mise en cache.
 * Ici, la coquille de l'en-tête est pré-rendue et seule cette petite zone
 * s'actualise après chargement.
 *
 * Conséquence assumée : pendant une fraction de seconde, l'en-tête affiche l'état
 * déconnecté. C'est le compromis standard des grandes plateformes marchandes, et il
 * est très largement préférable à la perte du cache sur l'ensemble du site.
 */

interface SessionState {
  firstName: string | null;
  isStaff: boolean;
  cartCount: number;
}

export function HeaderAccount() {
  const [state, setState] = useState<SessionState | null>(null);
  // Le panier et la connexion changent au fil de la navigation : on rafraîchit
  // à chaque changement d'URL.
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/v1/session', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SessionState | null) => {
        if (data) setState(data);
      })
      .catch(() => {
        // Hors ligne ou requête annulée : l'en-tête reste dans son état par défaut,
        // qui est parfaitement utilisable — les liens fonctionnent.
      });

    return () => controller.abort();
  }, [pathname]);

  const cartCount = state?.cartCount ?? 0;
  const hrefCompte = state?.firstName ? '/compte' : '/connexion';
  const actif = (href: string): boolean => estPageCourante(pathname, href);
  const panierActif = actif('/panier');

  return (
    <div className="ms-auto flex items-center gap-1 md:ms-0">
      <Link
        href="/categories"
        aria-current={actif('/categories') ? 'page' : undefined}
        className={`rounded-control flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3 lg:hidden ${
          actif('/categories') ? FOND_ACTIF : 'text-ink-100 hover:bg-ink-800 hover:text-gold-300'
        }`}
        aria-label="Toutes les catégories"
      >
        <LayoutGrid className="h-5 w-5" aria-hidden />
      </Link>

      {state?.isStaff ? (
        <Link
          href="/admin"
          aria-current={actif('/admin') ? 'page' : undefined}
          className={`rounded-control flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3 ${
            actif('/admin') ? FOND_ACTIF : 'text-gold-300 hover:bg-ink-800'
          }`}
          aria-label="Administration"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <span className="hidden lg:inline">Admin</span>
        </Link>
      ) : null}

      <Link
        href={hrefCompte}
        aria-current={actif(hrefCompte) ? 'page' : undefined}
        className={`rounded-control flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3 ${
          actif(hrefCompte) ? FOND_ACTIF : 'text-ink-100 hover:bg-ink-800 hover:text-gold-300'
        }`}
      >
        <User className="h-5 w-5" aria-hidden />
        <span className="hidden max-w-28 truncate lg:inline">
          {state?.firstName ?? 'Se connecter'}
        </span>
      </Link>

      <Link
        href="/panier"
        aria-current={panierActif ? 'page' : undefined}
        className={`rounded-control relative flex items-center gap-2 px-2 py-2 text-sm transition-colors sm:px-3 ${
          panierActif ? FOND_ACTIF : 'text-ink-100 hover:bg-ink-800 hover:text-gold-300'
        }`}
      >
        <span className="relative">
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {cartCount > 0 ? (
            <span
              /* Doree sur fond dore, la pastille disparaitrait. */
              className={`absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold ${
                panierActif ? 'bg-ink-950 text-gold-300' : 'bg-gold-400 text-ink-950'
              }`}
              aria-hidden
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </span>
        <span className="hidden lg:inline">Panier</span>
        {cartCount > 0 ? (
          <span className="sr-only">{cartCount} article(s) dans le panier</span>
        ) : null}
      </Link>
    </div>
  );
}
