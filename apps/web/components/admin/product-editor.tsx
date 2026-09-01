'use client';

import { useActionState } from 'react';
import { Archive, Pencil, Plus, Power, Trash2, Undo2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import type { VarianteAdmin } from '@beralshopp/core';

import {
  type AdminActionState,
  ajouterVarianteAction,
  archiverProduitAction,
  basculerVarianteAction,
  modifierTextesAction,
  supprimerProduitAction,
  supprimerVarianteAction,
} from '@/lib/admin-actions';

/**
 * Édition d'un produit existant : textes, variantes, retrait de la vente.
 *
 * Trois blocs distincts plutôt qu'un formulaire unique : ils n'ont ni le même
 * rythme d'usage — on corrige un nom une fois, on ajuste des variantes souvent —
 * ni les mêmes conséquences. Mélanger un champ de texte et un bouton de
 * suppression définitive dans le même formulaire est une invitation à l'accident.
 */

const INITIAL: AdminActionState = {};

function Soumettre({
  libelle,
  enCours,
  ton = 'or',
  icone: Icone,
}: {
  readonly libelle: string;
  readonly enCours: string;
  readonly ton?: 'or' | 'danger' | 'neutre';
  readonly icone: typeof Pencil;
}) {
  const { pending } = useFormStatus();
  const styles =
    ton === 'danger'
      ? 'bg-danger-500 text-white hover:opacity-90'
      : ton === 'neutre'
        ? 'border-border text-content hover:border-gold-400 border'
        : 'beral-btn-gold';

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-control inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      <Icone className="h-4 w-4" aria-hidden />
      {pending ? enCours : libelle}
    </button>
  );
}

function Retour({ etat }: { readonly etat: AdminActionState }) {
  if (etat.error) {
    return (
      <p role="alert" className="text-danger-500 text-sm font-medium">
        {etat.error}
      </p>
    );
  }
  if (etat.success) {
    return (
      <p role="status" className="text-success-500 text-sm font-medium">
        {etat.success}
      </p>
    );
  }
  return null;
}

/* ═══════════════════════════ Nom et description ═══════════════════════════ */

export function ProductTextForm({
  productId,
  nom,
  description,
}: {
  readonly productId: string;
  readonly nom: string;
  readonly description: string;
}) {
  const [etat, action] = useActionState(modifierTextesAction, INITIAL);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />

      <div>
        <label htmlFor="nom" className="text-content block text-sm font-medium">
          Nom du produit
        </label>
        <input
          id="nom"
          name="nom"
          type="text"
          defaultValue={nom}
          required
          className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="text-content block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          defaultValue={description}
          className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2.5 text-sm"
        />
      </div>

      <p className="text-content-muted text-xs">
        L’adresse de la fiche ne change pas quand vous corrigez le nom : les liens déjà partagés et
        le référencement Google restent valables.
      </p>

      <Retour etat={etat} />
      <Soumettre libelle="Enregistrer" enCours="Enregistrement…" icone={Pencil} />
    </form>
  );
}

/* ═══════════════════════════ Variantes ═══════════════════════════ */

export function VariantManager({
  productId,
  variantes,
  devise,
}: {
  readonly productId: string;
  readonly variantes: readonly VarianteAdmin[];
  readonly devise: string;
}) {
  const [etat, action] = useActionState(ajouterVarianteAction, INITIAL);

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {variantes.map((v) => (
          <li
            key={v.id}
            className="border-border rounded-control flex flex-wrap items-center justify-between gap-3 border p-3"
          >
            <div className="min-w-0">
              <p className="text-content text-sm font-medium">
                {v.libelle}
                {!v.isActive ? (
                  <span className="text-content-muted ms-2 text-xs">(désactivée)</span>
                ) : null}
              </p>
              <p className="text-content-muted beral-price text-xs">
                {v.sku} · stock {v.stockQuantity}
                {v.reservedQuantity > 0 ? ` · ${v.reservedQuantity} réservé` : ''}
                {v.priceDeltaMinor !== 0
                  ? ` · ${v.priceDeltaMinor > 0 ? '+' : ''}${v.priceDeltaMinor} ${devise}`
                  : ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <form action={basculerVarianteAction}>
                <input type="hidden" name="variantId" value={v.id} />
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="actif" value={v.isActive ? '0' : '1'} />
                <button
                  type="submit"
                  className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-xs transition-colors"
                >
                  <Power className="h-3.5 w-3.5" aria-hidden />
                  {v.isActive ? 'Désactiver' : 'Activer'}
                </button>
              </form>

              {v.supprimable ? (
                <form action={supprimerVarianteAction}>
                  <input type="hidden" name="variantId" value={v.id} />
                  <input type="hidden" name="productId" value={productId} />
                  <button
                    type="submit"
                    aria-label={`Supprimer la variante ${v.libelle}`}
                    className="text-content-muted hover:text-danger-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              ) : (
                <span className="text-content-muted text-xs" title="Déjà commandée">
                  vendue
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form action={action} className="border-border space-y-3 border-t pt-4">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-content text-sm font-medium">Ajouter une variante</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="attribut" className="text-content-muted block text-xs">
              Attribut
            </label>
            <input
              id="attribut"
              name="attribut"
              type="text"
              placeholder="Couleur"
              required
              className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="valeur" className="text-content-muted block text-xs">
              Valeur
            </label>
            <input
              id="valeur"
              name="valeur"
              type="text"
              placeholder="Rouge"
              required
              className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="stock" className="text-content-muted block text-xs">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="text"
              inputMode="numeric"
              defaultValue="0"
              className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="delta" className="text-content-muted block text-xs">
              Écart de prix ({devise})
            </label>
            <input
              id="delta"
              name="delta"
              type="text"
              inputMode="numeric"
              defaultValue="0"
              className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
            />
            <p className="text-content-muted mt-1 text-xs">
              0 si cette variante coûte le même prix. Une valeur négative est acceptée.
            </p>
          </div>
        </div>

        <Retour etat={etat} />
        <Soumettre libelle="Ajouter la variante" enCours="Ajout…" icone={Plus} />
      </form>
    </div>
  );
}

/* ═══════════════════════════ Retrait de la vente ═══════════════════════════ */

export function ProductRemoval({
  productId,
  archive,
  commandes,
  suppressionPossible,
}: {
  readonly productId: string;
  readonly archive: boolean;
  readonly commandes: number;
  readonly suppressionPossible: boolean;
}) {
  const [etatArchive, actionArchive] = useActionState(archiverProduitAction, INITIAL);
  const [etatSuppr, actionSuppr] = useActionState(supprimerProduitAction, INITIAL);

  return (
    <div className="space-y-5">
      <form action={actionArchive} className="space-y-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="archiver" value={archive ? '0' : '1'} />
        <p className="text-content-muted text-sm">
          {archive
            ? 'Ce produit est archivé : il n’apparaît plus dans la boutique. Vous pouvez le remettre en brouillon pour le retravailler.'
            : 'L’archivage retire le produit de la boutique sans rien effacer. C’est réversible à tout moment.'}
        </p>
        <Retour etat={etatArchive} />
        <Soumettre
          libelle={archive ? 'Remettre en brouillon' : 'Archiver le produit'}
          enCours="En cours…"
          ton="neutre"
          icone={archive ? Undo2 : Archive}
        />
      </form>

      <form action={actionSuppr} className="border-border space-y-2 border-t pt-4">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-content-muted text-sm">
          {suppressionPossible ? (
            <>
              Ce produit n’a jamais été commandé : il peut être supprimé définitivement, avec ses
              photos et ses variantes. <strong>Cette action est irréversible.</strong>
            </>
          ) : (
            <>
              Ce produit figure dans <strong>{commandes} commande(s)</strong>. La suppression est
              refusée : le lien avec ces commandes serait rompu, et vous ne pourriez plus traiter un
              retour ni répondre à un litige. Archivez-le plutôt.
            </>
          )}
        </p>
        <Retour etat={etatSuppr} />
        {suppressionPossible ? (
          <Soumettre
            libelle="Supprimer définitivement"
            enCours="Suppression…"
            ton="danger"
            icone={Trash2}
          />
        ) : null}
      </form>
    </div>
  );
}
