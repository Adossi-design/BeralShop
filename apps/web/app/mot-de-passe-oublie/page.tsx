import type { Metadata } from 'next';
import Link from 'next/link';

import { RequestResetForm } from '@/components/auth/reset-forms';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main id="contenu" className="beral-container flex-1 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-content text-2xl font-bold">Mot de passe oublié</h1>
        <p className="text-content-muted mt-1 text-sm">
          Saisissez le numéro ou l&apos;adresse e-mail de votre compte. Nous vous enverrons un lien
          pour choisir un nouveau mot de passe.
        </p>

        <div className="mt-6">
          <RequestResetForm />
        </div>

        <p className="text-content-muted mt-6 text-center text-sm">
          <Link href="/connexion" className="text-gold-700 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
