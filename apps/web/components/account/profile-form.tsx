'use client';

import { useActionState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { type EtatRectification, rectifierProfilAction } from '@/lib/personal-data-actions';

/**
 * Correction par le client de ses propres informations.
 *
 * Le mot de passe est demandé même pour un simple changement de nom : le
 * formulaire modifie aussi le téléphone, qui sert à se connecter, et l'e-mail,
 * qui sert à réinitialiser le mot de passe. Les séparer en deux formulaires —
 * l'un protégé, l'autre non — donnerait deux chemins à surveiller au lieu d'un.
 */

const INITIAL: EtatRectification = {};

interface ProfileFormProps {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
}

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Pencil className="h-4 w-4" aria-hidden />
      {pending ? 'Enregistrement…' : 'Enregistrer les modifications'}
    </button>
  );
}

function Champ({
  id,
  label,
  type,
  defaultValue,
  erreur,
  aide,
  autoComplete,
  required,
}: {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly defaultValue?: string;
  readonly erreur?: string | undefined;
  readonly aide?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-content block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete ?? 'off'}
        required={required ?? false}
        aria-invalid={erreur ? true : undefined}
        className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-sm border px-3 py-2.5 text-sm"
      />
      {aide ? <p className="text-content-muted mt-1 text-xs">{aide}</p> : null}
      {erreur ? (
        <p role="alert" className="text-danger-500 mt-1 text-sm">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}

export function ProfileForm({ fullName, phone, email }: ProfileFormProps) {
  const [etat, action] = useActionState(rectifierProfilAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Champ
        id="fullName"
        label="Nom complet"
        type="text"
        defaultValue={fullName}
        autoComplete="name"
        required
        erreur={etat.erreurs?.['fullName']}
      />

      <Champ
        id="phone"
        label="Téléphone"
        type="tel"
        defaultValue={phone}
        autoComplete="tel"
        required
        aide="Sert aussi à vous connecter. Format international : +250788123456"
        erreur={etat.erreurs?.['phone']}
      />

      <Champ
        id="email"
        label="Adresse e-mail (facultative)"
        type="email"
        defaultValue={email ?? ''}
        autoComplete="email"
        aide="Laissez vide pour la retirer de nos enregistrements."
        erreur={etat.erreurs?.['email']}
      />

      <div className="border-border border-t pt-4">
        <Champ
          id="currentPassword"
          label="Votre mot de passe actuel"
          type="password"
          autoComplete="current-password"
          required
          aide="Demandé parce que ce formulaire modifie vos identifiants de connexion."
          erreur={etat.erreurs?.['currentPassword']}
        />
      </div>

      {etat.erreurs?.['general'] ? (
        <p role="alert" className="text-danger-500 text-sm font-medium">
          {etat.erreurs['general']}
        </p>
      ) : null}

      {etat.succes ? (
        <p
          role="status"
          className="border-success-500/40 bg-success-500/5 text-success-500 rounded-control flex items-center gap-2 border px-4 py-2.5 text-sm"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Vos informations ont été mises à jour.
        </p>
      ) : null}

      <Bouton />
    </form>
  );
}
