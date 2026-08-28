'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Search, ShoppingCart, User } from 'lucide-react';

/**
 * Barre de navigation basse — TÉLÉPHONE ET TABLETTE UNIQUEMENT.
 *
 * POURQUOI ELLE EXISTE
 * Sur un téléphone tenu à une main, le haut de l'écran est hors de portée du
 * pouce. Or le panier et les catégories — les deux actions les plus fréquentes
 * d'une boutique — n'étaient accessibles que là-haut. C'est le motif central des
 * applications marchandes, et la raison pour laquelle elles convertissent mieux
 * qu'un site mobile classique.
 *
 * `lg:hidden` la fait disparaître à partir de 1024 px : le bureau, où le pointeur
 * atteint le haut de l'écran sans effort, garde exactement sa mise en page.
 *
 * Cinq entrées, pas plus : au-delà, les cibles deviennent trop étroites pour un
 * doigt. Elles reprennent les destinations qui existent RÉELLEMENT sur ce site —
 * pas celles de l'application prise en référence.
 *
 * Composant CLIENT pour deux raisons : connaître la page courante afin de la
 * signaler, et afficher le compteur du panier. Comme l'en-tête, il lit la session
 * après chargement plutôt que sur le serveur — lire le cookie côté serveur
 * rendrait toutes les pages dynamiques et supprimerait la mise en cache du site.
 */

const ONGLETS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/categories', label: 'Catégories', icon: LayoutGrid },
  { href: '/recherche', label: 'Rechercher', icon: Search },
  { href: '/panier', label: 'Panier', icon: ShoppingCart },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [connecte, setConnecte] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/v1/session', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { cartCount?: number; firstName?: string | null } | null) => {
        if (!data) return;
        setCartCount(data.cartCount ?? 0);
        setConnecte(Boolean(data.firstName));
      })
      .catch(() => {
        // Hors ligne : la barre reste utilisable, seuls le compteur et l'état de
        // connexion manquent. Les liens, eux, fonctionnent toujours.
      });

    return () => controller.abort();
  }, [pathname]);

  const estActif = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const hrefCompte = connecte ? '/compte' : '/connexion';

  return (
    <nav
      aria-label="Navigation principale"
      className="border-ink-800 bg-surface-brand fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
      /* `env(safe-area-inset-bottom)` : sur les iPhone à encoche, la barre
         système du bas recouvrirait sinon les libellés. */
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch">
        {ONGLETS.map((onglet) => {
          const actif = estActif(onglet.href);
          return (
            <li key={onglet.href} className="flex-1">
              <Link
                href={onglet.href}
                aria-current={actif ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[0.65rem] transition-colors ${
                  actif ? 'text-gold-300' : 'text-ink-300'
                }`}
              >
                <span className="relative">
                  <onglet.icon className="h-5 w-5" aria-hidden />
                  {onglet.href === '/panier' && cartCount > 0 ? (
                    <span
                      className="bg-gold-400 text-ink-950 absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold"
                      aria-hidden
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  ) : null}
                </span>
                {onglet.label}
                {onglet.href === '/panier' && cartCount > 0 ? (
                  <span className="sr-only">{cartCount} article(s)</span>
                ) : null}
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <Link
            href={hrefCompte}
            aria-current={estActif('/compte') ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[0.65rem] transition-colors ${
              estActif('/compte') ? 'text-gold-300' : 'text-ink-300'
            }`}
          >
            <User className="h-5 w-5" aria-hidden />
            {connecte ? 'Mon compte' : 'Connexion'}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
