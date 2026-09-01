import type { Metadata } from 'next';
import { Monitor } from 'lucide-react';

import { listActiveSessions } from '@beralshopp/core';
import { FUSEAU_BOUTIQUE } from '@beralshopp/shared';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { revokeOtherSessionsAction } from '@/lib/auth-actions';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Sécurité',
  robots: { index: false, follow: false },
};

/** Décrit un appareil sans exposer la chaîne technique complète au client. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Appareil inconnu';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Safari\//.test(userAgent)
        ? 'Safari'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : 'Navigateur';
  return `${browser} · ${isMobile ? 'Téléphone' : 'Ordinateur'}`;
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: FUSEAU_BOUTIQUE,
});

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const sessions = await listActiveSessions(user.id);

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Sécurité</h1>

      <section className="mt-6">
        <h2 className="text-content font-semibold">Mot de passe</h2>
        <p className="text-content-muted mt-1 mb-4 text-sm">
          En le modifiant, vos autres appareils seront déconnectés.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="border-border mt-10 border-t pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-content font-semibold">Connexions actives</h2>
            <p className="text-content-muted mt-1 text-sm">
              Les appareils actuellement connectés à votre compte.
            </p>
          </div>

          {sessions.length > 1 ? (
            <form action={revokeOtherSessionsAction}>
              <button
                type="submit"
                className="border-border text-content-muted hover:border-danger-500 hover:text-danger-500 rounded-control border px-4 py-2 text-sm transition-colors"
              >
                Déconnecter les autres appareils
              </button>
            </form>
          ) : null}
        </div>

        <ul className="mt-4 space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="border-border bg-surface rounded-card flex items-start gap-3 border p-4 text-sm"
            >
              <Monitor className="text-content-muted mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-content font-medium">{describeDevice(session.userAgent)}</p>
                <p className="text-content-muted mt-0.5 text-xs">
                  Dernière activité : {dateFormat.format(session.lastSeenAt)}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
