'use client';

import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Briques communes aux formulaires d'authentification.
 *
 * Chaque champ porte son erreur juste en dessous, associée par `aria-describedby` :
 * un lecteur d'écran annonce l'erreur au moment où l'utilisateur atteint le champ,
 * et non dans un bandeau isolé en haut de page qu'il n'entendra jamais.
 */

export function Field({
  label,
  name,
  type = 'text',
  error,
  hint,
  required,
  autoComplete,
  inputMode,
  defaultValue,
  placeholder,
}: {
  readonly label: string;
  readonly name: string;
  readonly type?: string;
  readonly error?: string | undefined;
  readonly hint?: string;
  readonly required?: boolean;
  readonly autoComplete?: string;
  readonly inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  readonly defaultValue?: string;
  readonly placeholder?: string;
}) {
  const id = `champ-${name}`;
  const errorId = `${id}-erreur`;
  const hintId = `${id}-aide`;

  return (
    <div>
      <label htmlFor={id} className="text-content block text-sm font-medium">
        {label}
        {required ? (
          <span className="text-danger-500" aria-hidden>
            {' '}
            *
          </span>
        ) : (
          <span className="text-content-muted font-normal"> (facultatif)</span>
        )}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        required={required ?? false}
        autoComplete={autoComplete ?? ''}
        {...(inputMode ? { inputMode } : {})}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(placeholder ? { placeholder } : {})}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`rounded-control bg-surface text-content mt-1.5 h-11 w-full border px-3 text-base focus:outline-none ${
          error ? 'border-danger-500' : 'border-border focus:border-gold-500'
        }`}
      />

      {error ? (
        <p id={errorId} className="text-danger-500 mt-1.5 text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-content-muted mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;

  const isError = Boolean(error);
  return (
    <p
      // `assertive` pour une erreur : elle interrompt la lecture en cours, car
      // l'utilisateur ne peut pas continuer sans en tenir compte.
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`rounded-control flex items-start gap-2 border px-4 py-3 text-sm ${
        isError
          ? 'border-danger-500/40 bg-danger-500/5 text-danger-500'
          : 'border-success-500/40 bg-success-500/5 text-success-500'
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{error ?? success}</span>
    </p>
  );
}

/**
 * Bouton de soumission.
 *
 * `useFormStatus` désactive le bouton pendant l'envoi : c'est ce qui empêche un
 * double clic de créer deux comptes ou de lancer deux tentatives de connexion.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex h-11 w-full items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
