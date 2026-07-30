'use client';

import { useActionState } from 'react';

import { type FormState, loginAction } from '@/lib/auth-actions';

import { Field, FormAlert, SubmitButton } from './form-kit';

const INITIAL: FormState = {};

export function LoginForm({ returnTo }: { readonly returnTo?: string }) {
  const [state, action] = useActionState(loginAction, INITIAL);

  return (
    <form action={action} className="space-y-4" noValidate>
      {returnTo ? <input type="hidden" name="suite" value={returnTo} /> : null}

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

      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        {...(state.fieldErrors?.['password'] ? { error: state.fieldErrors['password'] } : {})}
      />

      <SubmitButton label="Se connecter" pendingLabel="Connexion…" />
    </form>
  );
}
