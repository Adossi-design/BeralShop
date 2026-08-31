'use client';

import { useActionState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { type EtatCreationProduit, creerProduitAction } from '@/lib/admin-actions';

/**
 * Création d'un produit.
 *
 * Volontairement COURT : référence, nom, prix, stock, catégorie. Photos,
 * description longue, variantes et publication se règlent ensuite sur la fiche.
 * Un formulaire de création qui demande tout d'un coup décourage, et pousse à
 * remplir n'importe quoi pour en finir.
 */

const INITIAL: EtatCreationProduit = {};

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <PackagePlus className="h-4 w-4" aria-hidden />
      {pending ? 'Création…' : 'Créer le produit'}
    </button>
  );
}

function Champ({
  id,
  label,
  type = 'text',
  aide,
  erreur,
  required,
  inputMode,
  defaultValue,
}: {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly aide?: string;
  readonly erreur?: string | undefined;
  readonly required?: boolean;
  readonly inputMode?: 'numeric';
  readonly defaultValue?: string;
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
        required={required ?? false}
        {...(inputMode ? { inputMode } : {})}
        aria-invalid={erreur ? true : undefined}
        className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-md border px-3 py-2.5 text-sm"
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

export function NewProductForm({
  categories,
}: {
  readonly categories: readonly { readonly id: string; readonly name: string }[];
}) {
  const [etat, action] = useActionState(creerProduitAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Champ
        id="sku"
        label="Référence interne"
        required
        defaultValue={etat.valeurs?.['sku'] ?? ''}
        aide="Votre code produit : lettres, chiffres et tirets. Exemple : ELEC-CAM-Q8"
        erreur={etat.erreurs?.['sku']}
      />

      <Champ
        id="nom"
        label="Nom du produit"
        required
        defaultValue={etat.valeurs?.['nom'] ?? ''}
        aide="Tel qu’il apparaîtra dans la boutique et dans les résultats de recherche."
        erreur={etat.erreurs?.['nom']}
      />

      <div>
        <label htmlFor="description" className="text-content block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={etat.valeurs?.['description'] ?? ''}
          className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-md border px-3 py-2.5 text-sm"
        />
        <p className="text-content-muted mt-1 text-xs">
          Facultative à la création — vous pourrez la compléter ensuite.
        </p>
      </div>

      <Champ
        id="prix"
        label="Prix de vente (Frw)"
        inputMode="numeric"
        required
        defaultValue={etat.valeurs?.['prix'] ?? '0'}
        aide="En francs rwandais, sans décimale."
        erreur={etat.erreurs?.['prix']}
      />

      <Champ
        id="stock"
        label="Stock initial"
        inputMode="numeric"
        required
        defaultValue={etat.valeurs?.['stock'] ?? '0'}
        aide="Quantité réellement disponible. Modifiable à tout moment."
        erreur={etat.erreurs?.['stock']}
      />

      <div>
        <label htmlFor="categoryId" className="text-content block text-sm font-medium">
          Catégorie
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={etat.valeurs?.['categoryId'] ?? ''}
          className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-md border px-3 py-2.5 text-sm"
        >
          <option value="">— Sans catégorie —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-content-muted mt-1 text-xs">
          Un produit sans catégorie reste introuvable en navigation : il n’apparaît que par la
          recherche.
        </p>
      </div>

      {etat.erreurs?.['general'] ? (
        <p role="alert" className="text-danger-500 text-sm font-medium">
          {etat.erreurs['general']}
        </p>
      ) : null}

      <p className="border-border text-content-muted rounded-control border border-dashed px-4 py-3 text-sm">
        Le produit sera créé <strong>en brouillon</strong>, avec une variante par défaut. Ajoutez
        ses photos puis passez-le « En vente » depuis sa fiche.
      </p>

      <Bouton />
    </form>
  );
}
