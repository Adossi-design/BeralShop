'use client';

import { useActionState } from 'react';

import { type FormState, requestResetAction, resetPasswordAction } from '@/lib/auth-actions';

import { Field, FormAlert, SubmitButton } from './form-kit';

const INITIAL: FormState = {};

/** Demande d'un lien de réinitialisation. */
export function RequestResetForm() {
  const [state, action] = useActionState(requestResetAction, INITIAL);

  // Une fois la demande envoyée, le formulaire disparaît : le laisser affiché
  // inviterait à cliquer plusieurs fois, ce qui invaliderait le lien précédent.
  if (state.success) {
    return <FormAlert success={state.success} />;
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert {...(state.error ? { error: state.error } : {})} />

      <Field
        label="Numéro de téléphone ou e-mail"
        name="identifier"
        autoComplete="username"
        inputMode="tel"
        placeholder="+250788123456"
        required
        {...(state.fieldErrors?.['identifier'] ? { error: state.fieldErrors['identifier'] } : {})}
      />

      <SubmitButton label="Envoyer le lien" pendingLabel="Envoi…" />
    </form>
  );
}

/** Saisie du nouveau mot de passe, depuis le lien reçu. */
export function ResetPasswordForm({ token }: { readonly token: string }) {
  const [state, action] = useActionState(resetPasswordAction, INITIAL);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <FormAlert {...(state.error ? { error: state.error } : {})} />

      <Field
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Au moins 8 caractères."
        required
        {...(state.fieldErrors?.['password'] ? { error: state.fieldErrors['password'] } : {})}
      />

      <Field
        label="Confirmer le mot de passe"
        name="passwordConfirmation"
        type="password"
        autoComplete="new-password"
        required
        {...(state.fieldErrors?.['passwordConfirmation']
          ? { error: state.fieldErrors['passwordConfirmation'] }
          : {})}
      />

      <p className="text-content-muted text-xs">
        Par sécurité, vous serez déconnecté de tous vos appareils.
      </p>

      <SubmitButton label="Changer mon mot de passe" pendingLabel="Enregistrement…" />
    </form>
  );
}
