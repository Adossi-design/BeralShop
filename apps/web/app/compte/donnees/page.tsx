import type { Metadata } from 'next';

import { PersonalDataPanel } from '@/components/account/personal-data-panel';

export const metadata: Metadata = {
  title: 'Mes données personnelles',
  robots: { index: false, follow: false },
};

export default function DonneesPage() {
  return (
    <div>
      <h1 className="text-content text-xl font-bold">Mes données personnelles</h1>
      <p className="text-content-muted mt-1 text-sm">
        Téléchargez ce que nous détenons sur vous, ou supprimez définitivement votre compte.
      </p>

      <div className="mt-6">
        <PersonalDataPanel />
      </div>
    </div>
  );
}
