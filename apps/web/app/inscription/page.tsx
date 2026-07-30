import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RegisterForm } from '@/components/auth/register-form';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Créer un compte',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = typeof params['suite'] === 'string' ? params['suite'] : undefined;

  const user = await getCurrentUser();
  if (user) redirect('/compte');

  return (
    <main id="contenu" className="beral-container flex-1 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-content text-2xl font-bold">Créer un compte</h1>
        <p className="text-content-muted mt-1 text-sm">
          Suivez vos commandes et commandez plus vite la prochaine fois.
        </p>

        <div className="mt-6">
          <RegisterForm {...(returnTo ? { returnTo } : {})} />
        </div>

        <p className="text-content-muted mt-6 text-center text-sm">
          Vous avez déjà un compte ?{' '}
          <Link
            href={`/connexion${returnTo ? `?suite=${encodeURIComponent(returnTo)}` : ''}`}
            className="text-gold-700 font-medium hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
