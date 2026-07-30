import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = typeof params['suite'] === 'string' ? params['suite'] : undefined;

  // Déjà connecté : inutile d'afficher un formulaire de connexion.
  const user = await getCurrentUser();
  if (user) redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/compte');

  return (
    <main id="contenu" className="beral-container flex-1 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-content text-2xl font-bold">Se connecter</h1>
        <p className="text-content-muted mt-1 text-sm">
          Retrouvez vos commandes, vos adresses et votre panier.
        </p>

        {params['reinitialise'] === '1' ? (
          <p
            role="status"
            className="border-success-500/40 bg-success-500/5 text-success-500 rounded-control mt-5 flex items-start gap-2 border px-4 py-3 text-sm"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Mot de passe modifié. Connectez-vous avec le nouveau.</span>
          </p>
        ) : null}

        <div className="mt-6">
          <LoginForm {...(returnTo ? { returnTo } : {})} />
        </div>

        <p className="mt-4 text-center text-sm">
          <Link href="/mot-de-passe-oublie" className="text-gold-700 hover:underline">
            Mot de passe oublié ?
          </Link>
        </p>

        <div className="border-border mt-8 border-t pt-6 text-center text-sm">
          <p className="text-content-muted">Pas encore de compte ?</p>
          <Link
            href={`/inscription${returnTo ? `?suite=${encodeURIComponent(returnTo)}` : ''}`}
            className="border-border text-content hover:border-gold-400 hover:text-gold-700 rounded-control mt-3 inline-block border px-6 py-2.5 font-medium transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
