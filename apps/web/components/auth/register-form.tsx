'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { AGE_MINIMUM } from '@beralshopp/shared';

import { type FormState, registerAction } from '@/lib/auth-actions';

import { Field, FormAlert, SubmitButton } from './form-kit';

const INITIAL: FormState = {};

export function RegisterForm({ returnTo }: { readonly returnTo?: string }) {
  const [state, action] = useActionState(registerAction, INITIAL);

  return (
    <form action={action} className="space-y-4" noValidate>
      {returnTo ? <input type="hidden" name="suite" value={returnTo} /> : null}

      <FormAlert {...(state.error ? { error: state.error } : {})} />

      <Field
        label="Nom complet"
        name="fullName"
        autoComplete="name"
        required
        {...(state.fieldErrors?.['fullName'] ? { error: state.fieldErrors['fullName'] } : {})}
      />

      {/* Le téléphone est OBLIGATOIRE et l'e-mail facultatif : c'est l'inverse des
          plateformes occidentales, et c'est délibéré. Beaucoup de clients au Rwanda
          n'utilisent pas d'adresse e-mail au quotidien, mais tous ont un numéro. */}
      <Field
        label="Numéro de téléphone"
        name="phone"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+250788123456"
        hint="Format international, avec l'indicatif du pays."
        required
        {...(state.fieldErrors?.['phone'] ? { error: state.fieldErrors['phone'] } : {})}
      />

      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        hint="Pour recevoir vos confirmations de commande."
        {...(state.fieldErrors?.['email'] ? { error: state.fieldErrors['email'] } : {})}
      />

      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Au moins 8 caractères. Une phrase facile à retenir vaut mieux qu'un mot compliqué."
        required
        {...(state.fieldErrors?.['password'] ? { error: state.fieldErrors['password'] } : {})}
      />

      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="acceptsTerms"
            required
            className="border-border accent-gold-500 mt-0.5 h-4 w-4 shrink-0 rounded"
          />
          <span className="text-content-muted">
            J&apos;accepte les{' '}
            <Link href="/conditions" className="text-gold-700 underline">
              conditions de vente
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="text-gold-700 underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {state.fieldErrors?.['acceptsTerms'] ? (
          <p className="text-danger-500 mt-1.5 text-sm">{state.fieldErrors['acceptsTerms']}</p>
        ) : null}
      </div>

      {/* Déclaration d'âge, volontairement séparée de l'acceptation des conditions :
          noyée dans un long texte, elle ne vaudrait rien le jour où il faudrait la
          produire. */}
      <div>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="confirmsAge"
            required
            className="border-border accent-gold-500 mt-0.5 h-4 w-4 shrink-0 rounded"
          />
          <span className="text-content-muted">
            Je déclare avoir <strong>{AGE_MINIMUM} ans ou plus</strong>.
          </span>
        </label>
        {state.fieldErrors?.['confirmsAge'] ? (
          <p className="text-danger-500 mt-1.5 text-sm">{state.fieldErrors['confirmsAge']}</p>
        ) : null}
      </div>

      <SubmitButton label="Créer mon compte" pendingLabel="Création…" />
    </form>
  );
}
