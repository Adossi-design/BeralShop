'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Field, FormAlert } from '@/components/auth/form-kit';
import { type CheckoutFormState, checkoutAction } from '@/lib/order-actions';

const INITIAL: CheckoutFormState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex h-12 w-full items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
      {pending ? 'Création de la commande…' : 'Confirmer la commande'}
    </button>
  );
}

/**
 * Formulaire de commande.
 *
 * Les champs suivent l'adressage rwandais — Province, District, Secteur, Cellule,
 * Village — et non le modèle « rue + code postal », qui ne permet pas de livrer ici.
 * Le point de repère est facultatif mais mis en avant : c'est souvent l'information
 * la plus utile au livreur.
 */
export function CheckoutForm({
  defaultPhone,
  defaultName,
  defaultEmail,
  isLoggedIn,
}: {
  readonly defaultPhone?: string;
  readonly defaultName?: string;
  readonly defaultEmail?: string;
  readonly isLoggedIn: boolean;
}) {
  const [state, action] = useActionState(checkoutAction, INITIAL);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormAlert {...(state.error ? { error: state.error } : {})} />

      <section>
        <h2 className="text-content font-semibold">Adresse de livraison</h2>

        <div className="mt-4 space-y-4">
          <Field
            label="Nom du destinataire"
            name="recipientName"
            autoComplete="name"
            required
            {...(defaultName ? { defaultValue: defaultName } : {})}
            {...(errors['recipientName'] ? { error: errors['recipientName'] } : {})}
          />

          <Field
            label="Téléphone"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+250788123456"
            hint="Le livreur vous appellera sur ce numéro."
            required
            {...(defaultPhone ? { defaultValue: defaultPhone } : {})}
            {...(errors['phone'] ? { error: errors['phone'] } : {})}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Province"
              name="province"
              placeholder="Kigali"
              required
              {...(errors['province'] ? { error: errors['province'] } : {})}
            />
            <Field
              label="District"
              name="district"
              placeholder="Gasabo"
              required
              {...(errors['district'] ? { error: errors['district'] } : {})}
            />
            <Field
              label="Secteur"
              name="sector"
              placeholder="Remera"
              required
              {...(errors['sector'] ? { error: errors['sector'] } : {})}
            />
            <Field label="Cellule" name="cell" placeholder="Rukiri" />
          </div>

          <Field label="Village" name="village" />

          <Field
            label="Point de repère"
            name="landmark"
            hint="Ex. « en face de la pharmacie ». Souvent plus utile que l'adresse elle-même."
          />
        </div>
      </section>

      <section className="border-border border-t pt-6">
        <h2 className="text-content font-semibold">Contact</h2>
        <div className="mt-4">
          <Field
            label="Adresse e-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            hint="Pour recevoir la confirmation de commande."
            {...(defaultEmail ? { defaultValue: defaultEmail } : {})}
          />
        </div>
      </section>

      <section className="border-border border-t pt-6">
        <label htmlFor="note" className="text-content block text-sm font-medium">
          Note pour la livraison
          <span className="text-content-muted font-normal"> (facultatif)</span>
        </label>
        <textarea
          id="note"
          name="customerNote"
          rows={3}
          maxLength={500}
          placeholder="Horaires de disponibilité, précisions d'accès…"
          className="border-border rounded-control bg-surface text-content mt-1.5 w-full border px-3 py-2 text-base focus:outline-none"
        />

        {isLoggedIn ? (
          <label className="mt-4 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="saveAddress"
              defaultChecked
              className="border-border accent-gold-500 mt-0.5 h-4 w-4 shrink-0 rounded"
            />
            <span className="text-content-muted">
              Enregistrer cette adresse pour mes prochaines commandes
            </span>
          </label>
        ) : null}
      </section>

      <div className="border-border border-t pt-6">
        <ConfirmButton />
        <p className="text-content-muted mt-3 flex items-start gap-2 text-xs">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Le montant est recalculé sur nos serveurs à partir des prix du catalogue. Le paiement
            sécurisé arrive au lot suivant ; votre commande sera enregistrée en attente de paiement.
          </span>
        </p>
      </div>
    </form>
  );
}
