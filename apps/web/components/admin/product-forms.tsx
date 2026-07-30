'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import { FormAlert } from '@/components/auth/form-kit';
import { type AdminActionState, updateProductAction, updateStockAction } from '@/lib/admin-actions';

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
 * Prix et statut.
 *
 * Les montants sont saisis en FRANCS ENTIERS, l'unité réelle du RWF. Aucune
 * conversion n'est nécessaire ici : l'exposant du franc rwandais est zéro, ce que
 * l'utilisateur saisit est exactement ce qui est stocké. Le jour où une devise à
 * décimales sera gérée, la conversion se fera dans le service, jamais ici.
 */
export function ProductPricingForm({
  productId,
  basePriceMinor,
  compareAtPriceMinor,
  status,
}: {
  readonly productId: string;
  readonly basePriceMinor: number;
  readonly compareAtPriceMinor: number | null;
  readonly status: string;
}) {
  const [state, action] = useActionState(updateProductAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />

      <FormAlert
        {...(state.error ? { error: state.error } : {})}
        {...(state.success ? { success: state.success } : {})}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="prix" className="text-content block text-sm font-medium">
            Prix de vente (Frw)
          </label>
          <input
            id="prix"
            name="basePriceMinor"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={basePriceMinor}
            className="border-border bg-surface text-content beral-price rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="ancien" className="text-content block text-sm font-medium">
            Ancien prix barré (Frw)
          </label>
          <input
            id="ancien"
            name="compareAtPriceMinor"
            type="number"
            min="0"
            step="1"
            defaultValue={compareAtPriceMinor ?? ''}
            placeholder="Laisser vide si pas de promotion"
            className="border-border bg-surface text-content beral-price rounded-control mt-1.5 h-10 w-full border px-3 text-sm focus:outline-none"
          />
          <p className="text-content-muted mt-1 text-xs">
            Doit être SUPÉRIEUR au prix de vente, sinon la promotion est ignorée.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="statut" className="text-content block text-sm font-medium">
          Statut
        </label>
        <select
          id="statut"
          name="status"
          defaultValue={status}
          className="border-border bg-surface text-content rounded-control mt-1.5 h-10 w-full max-w-xs border px-3 text-sm focus:outline-none"
        >
          <option value="ACTIVE">En vente</option>
          <option value="DRAFT">Brouillon (invisible)</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </div>

      <Submit label="Enregistrer" />
    </form>
  );
}

/** Stock d'une variante. */
export function StockForm({
  variantId,
  sku,
  label,
  stockQuantity,
  reservedQuantity,
}: {
  readonly variantId: string;
  readonly sku: string;
  readonly label: string;
  readonly stockQuantity: number;
  readonly reservedQuantity: number;
}) {
  const [state, action] = useActionState(updateStockAction, INITIAL);
  const available = Math.max(0, stockQuantity - reservedQuantity);

  return (
    <form action={action} className="border-border border-b py-3 last:border-b-0">
      <input type="hidden" name="variantId" value={variantId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-content text-sm font-medium">{label || 'Variante unique'}</p>
          <p className="text-content-muted beral-price text-xs">{sku}</p>
        </div>

        <div>
          <label
            htmlFor={`stock-${variantId}`}
            className="text-content-muted block text-xs font-medium"
          >
            Stock physique
          </label>
          <input
            id={`stock-${variantId}`}
            name="stockQuantity"
            type="number"
            min={reservedQuantity}
            step="1"
            defaultValue={stockQuantity}
            className="border-border bg-surface text-content beral-price rounded-control mt-1 h-9 w-24 border px-2 text-sm focus:outline-none"
          />
        </div>

        <div className="text-xs">
          <p className="text-content-muted">Réservé : {reservedQuantity}</p>
          <p
            className={
              available === 0
                ? 'text-danger-500 font-semibold'
                : available <= 5
                  ? 'text-warning-500 font-semibold'
                  : 'text-content-muted'
            }
          >
            Vendable : {available}
          </p>
        </div>

        <button
          type="submit"
          className="border-border text-content hover:border-gold-400 rounded-control h-9 border px-3 text-xs font-medium transition-colors"
        >
          Mettre à jour
        </button>
      </div>

      {state.error ? <p className="text-danger-500 mt-2 text-xs">{state.error}</p> : null}
      {state.success ? <p className="text-success-500 mt-2 text-xs">{state.success}</p> : null}
    </form>
  );
}
