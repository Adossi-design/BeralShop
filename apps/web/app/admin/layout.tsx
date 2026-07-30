import Link from 'next/link';
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Users,
} from 'lucide-react';

import { BeralshoppMark } from '@/components/beralshopp-logo';
import { logoutAction } from '@/lib/auth-actions';
import { requireStaff } from '@/lib/session';

/**
 * Espace d'administration.
 *
 * La protection est posée ICI : toute page sous /admin en hérite. `requireStaff`
 * redirige un simple client vers l'accueil — et non vers une erreur 403, qui
 * confirmerait l'existence de cet espace.
 *
 * Fond sombre, comme l'en-tête public : la bascule visuelle indique sans ambiguïté
 * qu'on n'est plus sur la boutique. Une erreur de contexte, en administration,
 * coûte cher.
 */

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/commandes', label: 'Commandes', icon: ClipboardList },
  { href: '/admin/produits', label: 'Produits', icon: Package },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/paiements', label: 'Paiements', icon: CreditCard },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff('/admin');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ——— Barre latérale ——— */}
      <aside className="beral-surface-brand lg:min-h-screen lg:w-60 lg:shrink-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <BeralshoppMark className="h-8 w-8" />
          <div className="min-w-0">
            <p className="beral-text-gold text-sm font-semibold">Administration</p>
            <p className="text-ink-400 truncate text-xs">{user.fullName}</p>
          </div>
        </div>

        <div className="beral-rule-gold" aria-hidden />

        <nav aria-label="Administration" className="p-3">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-ink-200 hover:bg-ink-800 hover:text-gold-300 rounded-control flex items-center gap-2.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors"
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-ink-800 mt-3 space-y-1 border-t pt-3">
            <Link
              href="/"
              className="text-ink-400 hover:bg-ink-800 hover:text-gold-300 rounded-control flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
            >
              <Store className="h-4 w-4 shrink-0" aria-hidden />
              Voir la boutique
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="text-ink-400 hover:bg-ink-800 hover:text-danger-500 rounded-control flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Se déconnecter
              </button>
            </form>
          </div>
        </nav>
      </aside>

      <main id="contenu" className="bg-surface-muted min-w-0 flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
