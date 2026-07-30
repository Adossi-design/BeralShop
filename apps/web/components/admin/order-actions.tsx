'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import type { OrderStatus } from '@beralshopp/db';

import { FormAlert } from '@/components/auth/form-kit';
import {
  type AdminActionState,
  changeOrderStatusAction,
  setTrackingAction,
} from '@/lib/admin-actions';

import { ORDER_STATUS_META } from './order-status-badge';

const INITIAL: AdminActionState = {};

function Submit({ label }: { readonly label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex h-10 items-center justify-center gap-2 px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}

/**
 * Changement de statut.
 *
 * Seules les transitions AUTORISÉES par la machine à états sont proposées. Afficher
 * tous les statuts et refuser au moment du clic serait une source d'erreurs
 * quotidienne pour l'équipe.
 */
export function ChangeStatusForm({
  orderNumber,
  allowed,
}: {
  readonly orderNumber: string;
  readonly allowed: readonly OrderStatus[];
}) {
  const [state, action] = useActionState(changeOrderStatusAction, INITIAL);

  if (allowed.length === 0) {
    return (
      <p className="text-content-muted text-sm">
        Cette commande est dans un état final : aucune évolution possible.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderNumber" value={orderNumber} />

      <FormAlert
        {...(state.error ? { error: state.error } : {})}
        {...(state.success ? { success: state.success } : {})}
      />

      <div>
        <label htmlFor="statut" className="text-content block text-sm font-medium">
          Nouveau statut
        </label>
        <select
          id="statut"
          name="status"
          required
          className="border-border bg-surface text-content rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
        >
          {allowed.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_META[status].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="note" className="text-content block text-sm font-medium">
          Motif <span className="text-content-muted font-normal">(facultatif)</span>
        </label>
        <input
          id="note"
          name="note"
          maxLength={200}
          placeholder="Consigné dans l'historique de la commande"
          className="border-border bg-surface text-content rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
        />
      </div>

      <Submit label="Changer le statut" />
    </form>
  );
}

/** Numéro de suivi transporteur. */
export function TrackingForm({
  orderNumber,
  trackingNumber,
  carrierName,
}: {
  readonly orderNumber: string;
  readonly trackingNumber: string | null;
  readonly carrierName: string | null;
}) {
  const [state, action] = useActionState(setTrackingAction, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderNumber" value={orderNumber} />

      <FormAlert
        {...(state.error ? { error: state.error } : {})}
        {...(state.success ? { success: state.success } : {})}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tracking" className="text-content block text-sm font-medium">
            Numéro de suivi
          </label>
          <input
            id="tracking"
            name="trackingNumber"
            defaultValue={trackingNumber ?? ''}
            className="border-border bg-surface text-content beral-price rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="carrier" className="text-content block text-sm font-medium">
            Transporteur
          </label>
          <input
            id="carrier"
            name="carrierName"
            defaultValue={carrierName ?? ''}
            placeholder="DHL, Kigali Express…"
            className="border-border bg-surface text-content rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
          />
        </div>
      </div>

      <Submit label="Enregistrer le suivi" />
    </form>
  );
}
