import { DatabaseZap, LogOut, MapPin, Package, ShieldCheck, User } from 'lucide-react';

import { RetourCompte } from '@/components/account/retour-compte';
import { LegalLinks } from '@/components/legal-links';
import { LienActif } from '@/components/lien-actif';
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
  { href: '/compte/donnees', label: 'Mes données', icon: DatabaseZap },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  /* La valeur n'est plus lue ici — le bandeau de la page « Mon compte » porte
     l'identité — mais l'APPEL reste : c'est lui qui protège toute la section. */
  await requireUser('/compte');

  return (
    <main id="contenu" className="beral-container flex-1 py-6">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Masque sous 1024 px : la page « Mon compte » y tient le role de menu,
            comme dans les applications marchandes. Le repeter au-dessus de chaque
            sous-page obligeait a defiler tout le menu avant d atteindre le
            contenu qu on venait lire. */}
        <aside className="max-lg:hidden">
          {/* L'identité vivait ici, en double : la page « Mon compte » porte
              désormais un bandeau qui la donne déjà, et l'en-tête du site affiche
              le prénom sur toutes les pages. Trois fois le même nom sur un même
              écran, c'est du bruit — le menu s'en tient à la navigation. */}
          <nav aria-label="Espace client">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <LienActif
                    href={item.href}
                    exact={item.href === '/compte'}
                    variante="clair"
                    base="rounded-control flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </LienActif>
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

          <LegalLinks className="border-border mt-3 border-t pt-3" />
        </aside>

        <div>
          <RetourCompte />
          {children}
        </div>
      </div>
    </main>
  );
}
