import type { Metadata } from 'next';

import { PersonalDataPanel } from '@/components/account/personal-data-panel';
import { ProfileForm } from '@/components/account/profile-form';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Mes données personnelles',
  robots: { index: false, follow: false },
};

export default async function DonneesPage() {
  const user = await requireUser('/compte/donnees');

  return (
    <div>
      <h1 className="text-content text-xl font-bold">Mes données personnelles</h1>
      <p className="text-content-muted mt-1 text-sm">
        Corrigez vos informations, téléchargez ce que nous détenons sur vous, ou supprimez
        définitivement votre compte.
      </p>

      <section className="border-border bg-surface rounded-card mt-6 border p-5">
        <h2 className="text-content text-lg font-bold">Corriger mes informations</h2>
        <p className="text-content-muted mt-2 text-sm">
          Vous pouvez modifier à tout moment les informations que vous nous avez confiées.
        </p>
        <div className="mt-4">
          <ProfileForm fullName={user.fullName} phone={user.phone} email={user.email ?? null} />
        </div>
      </section>

      <div className="mt-8">
        <PersonalDataPanel />
      </div>
    </div>
  );
}
