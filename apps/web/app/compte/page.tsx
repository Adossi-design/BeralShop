import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Package, ShieldCheck } from 'lucide-react';

import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mon compte',
  robots: { index: false, follow: false },
};

const CARDS = [
  {
    href: '/compte/commandes',
    icon: Package,
    title: 'Mes commandes',
    text: 'Suivez vos commandes en cours et retrouvez vos achats passés.',
  },
  {
    href: '/compte/adresses',
    icon: MapPin,
    title: 'Mes adresses',
    text: 'Gérez vos adresses de livraison pour commander plus vite.',
  },
  {
    href: '/compte/securite',
    icon: ShieldCheck,
    title: 'Sécurité',
    text: 'Changez votre mot de passe et vérifiez vos connexions actives.',
  },
];

export default async function AccountPage() {
  // Le layout a déjà exigé une session ; cet appel est dédupliqué par React.
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">
        Bonjour {user?.fullName.split(' ')[0]}
      </h1>
      <p className="text-content-muted mt-1 text-sm">Bienvenue dans votre espace Beralshopp.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border-border bg-surface shadow-card hover:shadow-raised rounded-card border p-5 transition-shadow"
          >
            <card.icon className="text-gold-600 h-6 w-6" aria-hidden />
            <h2 className="text-content mt-3 font-semibold">{card.title}</h2>
            <p className="text-content-muted mt-1 text-sm">{card.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
