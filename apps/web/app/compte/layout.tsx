import Link from 'next/link';
import { LogOut, MapPin, Package, ShieldCheck, User } from 'lucide-react';

import { logoutAction } from '@/lib/auth-actions';
import { requireUser } from '@/lib/session';

/**
 * Espace client.
 *
 * La protection est posée ICI, dans le layout : toute page placée sous /compte en
 * hérite automatiquement. Protéger page par page finit toujours par laisser passer
 * celle qu'on a oublié de protéger.
 */

const NAV = [
  { href: '/compte', label: 'Tableau de bord', icon: User },
  { href: '/compte/commandes', label: 'Mes commandes', icon: Package },
  { href: '/compte/adresses', label: 'Mes adresses', icon: MapPin },
  { href: '/compte/securite', label: 'Sécurité', icon: ShieldCheck },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/compte');

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside>
          <div className="border-border bg-surface rounded-card border p-4">
            <p className="text-content font-semibold">{user.fullName}</p>
            <p className="text-content-muted beral-price mt-0.5 text-sm">{user.phone}</p>
            {user.role !== 'CLIENT' ? (
              <span className="bg-ink-900 mt-2 inline-block rounded px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
                {user.role === 'ADMIN' ? 'Administrateur' : 'Support'}
              </span>
            ) : null}
          </div>

          <nav aria-label="Espace client" className="mt-4">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-content hover:bg-surface-muted hover:text-gold-700 rounded-control flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Déconnexion en POST, jamais en lien : un lien serait déclenché par
                un préchargement du navigateur ou par une image distante piégée. */}
            <form action={logoutAction} className="border-border mt-3 border-t pt-3">
              <button
                type="submit"
                className="text-content-muted hover:bg-surface-muted hover:text-danger-500 rounded-control flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Se déconnecter
              </button>
            </form>
          </nav>
        </aside>

        <div>{children}</div>
      </div>
    </main>
  );
}
