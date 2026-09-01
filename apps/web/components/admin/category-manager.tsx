'use client';

import { useActionState, useState } from 'react';
import { Check, FolderPlus, Pencil, Power, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import type { CategorieAdmin } from '@beralshopp/core';

import {
  type AdminActionState,
  basculerCategorieAction,
  creerCategorieAction,
  renommerCategorieAction,
  supprimerCategorieAction,
} from '@/lib/admin-actions';

/**
 * Rubriques et sous-catégories.
 *
 * Deux niveaux au maximum, comme le service métier l'impose : au-delà, la
 * navigation devient illisible sur téléphone. L'arbre est affiché à plat, les
 * sous-catégories décalées sous leur rubrique — sur un tableau de bord, une
 * arborescence repliable coûte plus de clics qu'elle n'en économise.
 */

const INITIAL: AdminActionState = {};

function Bouton({
  libelle,
  enCours,
  icone: Icone,
}: {
  readonly libelle: string;
  readonly enCours: string;
  readonly icone: typeof Pencil;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icone className="h-4 w-4" aria-hidden />
      {pending ? enCours : libelle}
    </button>
  );
}

function Retour({ etat }: { readonly etat: AdminActionState }) {
  if (etat.error) {
    return (
      <p role="alert" className="text-danger-500 mt-2 text-sm font-medium">
        {etat.error}
      </p>
    );
  }
  if (etat.success) {
    return (
      <p role="status" className="text-success-500 mt-2 text-sm font-medium">
        {etat.success}
      </p>
    );
  }
  return null;
}

function Ligne({ categorie }: { readonly categorie: CategorieAdmin }) {
  const [edition, setEdition] = useState(false);
  const [etatRenom, actionRenom] = useActionState(renommerCategorieAction, INITIAL);
  const [etatSuppr, actionSuppr] = useActionState(supprimerCategorieAction, INITIAL);

  const sousCategorie = categorie.parentId !== null;

  return (
    <li
      className={`border-border rounded-control border p-3 ${sousCategorie ? 'ms-6' : ''} ${
        categorie.isActive ? '' : 'opacity-60'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {edition ? (
            <form action={actionRenom} className="flex items-center gap-2">
              <input type="hidden" name="categoryId" value={categorie.id} />
              <input
                name="nom"
                type="text"
                defaultValue={categorie.nom}
                required
                className="border-border bg-surface text-content rounded-control border px-2 py-1 text-sm"
              />
              <Bouton libelle="Valider" enCours="…" icone={Check} />
              <button
                type="button"
                onClick={() => setEdition(false)}
                className="text-content-muted text-xs hover:underline"
              >
                Annuler
              </button>
            </form>
          ) : (
            <p className="text-content text-sm font-medium">
              {sousCategorie ? '↳ ' : ''}
              {categorie.nom}
              {!categorie.isActive ? (
                <span className="text-content-muted ms-2 text-xs">(masquée)</span>
              ) : null}
            </p>
          )}

          <p className="text-content-muted mt-0.5 text-xs">
            {categorie.slug} · {categorie.nbProduits} produit
            {categorie.nbProduits > 1 ? 's' : ''}
            {categorie.nbEnfants > 0 ? ` · ${categorie.nbEnfants} sous-catégorie(s)` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!edition ? (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-xs transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Renommer
            </button>
          ) : null}

          <form action={basculerCategorieAction}>
            <input type="hidden" name="categoryId" value={categorie.id} />
            <input type="hidden" name="actif" value={categorie.isActive ? '0' : '1'} />
            <button
              type="submit"
              className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-xs transition-colors"
            >
              <Power className="h-3.5 w-3.5" aria-hidden />
              {categorie.isActive ? 'Masquer' : 'Afficher'}
            </button>
          </form>

          {categorie.supprimable ? (
            <form action={actionSuppr}>
              <input type="hidden" name="categoryId" value={categorie.id} />
              <button
                type="submit"
                aria-label={`Supprimer ${categorie.nom}`}
                className="text-content-muted hover:text-danger-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </form>
          ) : (
            <span
              className="text-content-muted text-xs"
              title="Contient des produits ou des sous-catégories"
            >
              non vide
            </span>
          )}
        </div>
      </div>

      <Retour etat={etatRenom} />
      <Retour etat={etatSuppr} />
    </li>
  );
}

export function CategoryManager({
  categories,
}: {
  readonly categories: readonly CategorieAdmin[];
}) {
  const [etat, action] = useActionState(creerCategorieAction, INITIAL);

  const rubriques = categories.filter((c) => c.parentId === null);
  const enfantsDe = (id: string) => categories.filter((c) => c.parentId === id);

  return (
    <div className="space-y-6">
      <section className="border-border bg-surface rounded-card border p-5">
        <h2 className="text-content font-semibold">Ajouter une catégorie</h2>
        <form action={action} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="nom" className="text-content-muted block text-xs">
                Nom
              </label>
              <input
                id="nom"
                name="nom"
                type="text"
                required
                placeholder="Téléphonie"
                className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="parentId" className="text-content-muted block text-xs">
                Rubrique parente
              </label>
              <select
                id="parentId"
                name="parentId"
                className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
              >
                <option value="">— Nouvelle rubrique —</option>
                {rubriques.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="iconName" className="text-content-muted block text-xs">
                Icône (facultative)
              </label>
              <input
                id="iconName"
                name="iconName"
                type="text"
                placeholder="smartphone"
                className="border-border bg-surface text-content rounded-control mt-1 w-full border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="text-content-muted text-xs">
            Une rubrique apparaît dans le menu principal et dans les pastilles d’accueil. Une
            sous-catégorie n’apparaît qu’à l’intérieur de sa rubrique.
          </p>

          <Retour etat={etat} />
          <Bouton libelle="Créer la catégorie" enCours="Création…" icone={FolderPlus} />
        </form>
      </section>

      <ul className="space-y-2">
        {rubriques.map((rubrique) => (
          <li key={rubrique.id}>
            <ul className="space-y-2">
              <Ligne categorie={rubrique} />
              {enfantsDe(rubrique.id).map((enfant) => (
                <Ligne key={enfant.id} categorie={enfant} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
