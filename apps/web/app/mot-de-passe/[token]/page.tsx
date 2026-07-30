import type { Metadata } from 'next';
import Link from 'next/link';

import { ResetPasswordForm } from '@/components/auth/reset-forms';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Saisie du nouveau mot de passe.
 *
 * La validité du jeton n'est PAS vérifiée à l'affichage, seulement à la soumission.
 * Vérifier ici permettrait de tester des jetons en boucle par simple chargement de
 * page, sans jamais rien soumettre.
 */
export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;

  return (
    <main id="contenu" className="beral-container flex-1 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-content text-2xl font-bold">Nouveau mot de passe</h1>
        <p className="text-content-muted mt-1 text-sm">
          Choisissez un mot de passe que vous seul connaissez.
        </p>

        <div className="mt-6">
          <ResetPasswordForm token={token} />
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
