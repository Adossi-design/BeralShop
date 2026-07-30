'use client';

import { useActionState } from 'react';

import { type FormState, changePasswordAction } from '@/lib/auth-actions';

import { Field, FormAlert, SubmitButton } from './form-kit';

const INITIAL: FormState = {};

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, INITIAL);

  return (
    <form action={action} className="max-w-md space-y-4" noValidate>
      <FormAlert
        {...(state.error ? { error: state.error } : {})}
        {...(state.success ? { success: state.success } : {})}
      />

      <Field
        label="Mot de passe actuel"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        {...(state.fieldErrors?.['currentPassword']
          ? { error: state.fieldErrors['currentPassword'] }
          : {})}
      />

      <Field
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Au moins 8 caractères, différent de votre nom et de votre numéro."
        required
        {...(state.fieldErrors?.['password'] ? { error: state.fieldErrors['password'] } : {})}
      />

      <Field
        label="Confirmer le nouveau mot de passe"
        name="passwordConfirmation"
        type="password"
        autoComplete="new-password"
        required
        {...(state.fieldErrors?.['passwordConfirmation']
          ? { error: state.fieldErrors['passwordConfirmation'] }
          : {})}
      />

      <SubmitButton label="Changer le mot de passe" pendingLabel="Enregistrement…" />
    </form>
  );
}
