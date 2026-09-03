'use client';

import { useActionState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { type EtatCreationProduit, creerProduitAction } from '@/lib/admin-actions';

import { SaisieCouleurs } from './saisie-couleurs';
import { SelecteurPhotos } from './selecteur-photos';

/**
 * Création d'un produit.
 *
 * DEUX COLONNES, ET CE N'EST PAS DÉCORATIF. Le formulaire tenait dans une
 * colonne étroite au milieu d'un écran vide : on descendait à l'aveugle sans
 * jamais voir combien il restait à remplir. Les champs sont maintenant groupés
 * par intention — ce que le produit est, ce qu'il coûte, où on le range — et
 * les photos occupent la colonne de droite, visibles dès l'arrivée.
 *
 * LES PHOTOS SE CHOISISSENT ICI, à la création. Auparavant il fallait créer le
 * produit, atterrir sur sa fiche, trouver la section « Photos » et recommencer.
 * Un produit sans photo ne se vend pas ; l'étape la plus importante ne doit pas
 * être celle qu'on découvre après coup. Elles partent dans le même envoi que le
 * reste : rien n'est déposé sur le stockage si la création échoue.
 *
 * Le formulaire reste COURT. Description longue, variantes, seuils et
 * publication se règlent ensuite sur la fiche : un formulaire de création qui
 * demande tout d'un coup décourage, et pousse à remplir n'importe quoi pour en
 * finir.
 */

const INITIAL: EtatCreationProduit = {};

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <PackagePlus className="h-4 w-4" aria-hidden />
      {pending ? 'Création…' : 'Créer le produit'}
    </button>
  );
}

function Section({
  titre,
  aide,
  children,
}: {
  readonly titre: string;
  readonly aide?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-surface rounded-card shadow-card border p-5">
      <h2 className="border-gold-400 text-content-muted border-s-2 ps-2 text-[0.65rem] font-semibold tracking-wider uppercase">
        {titre}
      </h2>
      {aide ? <p className="text-content-muted mt-2 text-xs">{aide}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Champ({
  id,
  label,
  aide,
  erreur,
  required,
  inputMode,
  defaultValue,
  suffixe,
  exemple,
}: {
  readonly id: string;
  readonly label: string;
  readonly aide?: string;
  readonly erreur?: string | undefined;
  readonly required?: boolean;
  readonly inputMode?: 'numeric';
  readonly defaultValue?: string;
  readonly suffixe?: string;
  readonly exemple?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-content block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={id}
          type="text"
          defaultValue={defaultValue}
          placeholder={exemple ?? ''}
          required={required ?? false}
          {...(inputMode ? { inputMode } : {})}
          aria-invalid={erreur ? true : undefined}
          className={`border-border bg-surface text-content rounded-control focus:border-gold-400 w-full border px-3 py-2.5 text-sm transition-colors outline-none ${
            erreur ? 'border-danger-500' : ''
          } ${suffixe ? 'pe-14' : ''}`}
        />
        {suffixe ? (
          <span className="text-content-muted pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs">
            {suffixe}
          </span>
        ) : null}
      </div>
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
  stockageActif,
}: {
  readonly categories: readonly { readonly id: string; readonly name: string }[];
  readonly stockageActif: boolean;
}) {
  const [etat, action] = useActionState(creerProduitAction, INITIAL);

  return (
    <form action={action} className="grid items-start gap-5 lg:grid-cols-3">
      {/* ——— Colonne de gauche : ce qu'est le produit ——— */}
      <div className="space-y-5 lg:col-span-2">
        <Section titre="Identité">
          {/* LE NOM PASSE EN PREMIER. La référence occupait cette place et
              était le seul champ qui demandait d'INVENTER quelque chose : on y
              tapait « 1 » ou « AAA » pour en finir, et six mois plus tard plus
              personne ne savait ce que désignait quoi. Elle est désormais
              engendrée à partir du nom, et repliée plus bas pour qui tient à la
              sienne. */}
          <Champ
            id="nom"
            label="Nom du produit"
            required
            defaultValue={etat.valeurs?.['nom'] ?? ''}
            exemple="Écouteurs sans fil Zentro X300"
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
              rows={4}
              defaultValue={etat.valeurs?.['description'] ?? ''}
              className="border-border bg-surface text-content rounded-control focus:border-gold-400 mt-1 w-full border px-3 py-2.5 text-sm transition-colors outline-none"
            />
            <p className="text-content-muted mt-1 text-xs">
              Facultative à la création — vous pourrez la compléter ensuite.
            </p>
          </div>

          {/* Repliée par défaut : neuf créations sur dix n'ont aucune raison de
              l'ouvrir. `open` quand une erreur la concerne, sinon le message
              s'afficherait dans un tiroir fermé et resterait invisible. */}
          <details
            className="border-border rounded-control border px-3 py-2"
            open={Boolean(etat.erreurs?.['sku'])}
          >
            <summary className="text-content-muted cursor-pointer text-xs">
              Référence interne — engendrée automatiquement
            </summary>
            <div className="mt-3">
              <Champ
                id="sku"
                label="Imposer une référence"
                defaultValue={etat.valeurs?.['sku'] ?? ''}
                exemple="Laissez vide pour l’engendrer"
                aide="Lettres, chiffres et tirets. À remplir seulement si votre boutique possède déjà son propre système de références."
                erreur={etat.erreurs?.['sku']}
              />
            </div>
          </details>
        </Section>

        <Section titre="Prix et stock">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ
              id="prix"
              label="Prix de vente"
              inputMode="numeric"
              required
              suffixe="Frw"
              defaultValue={etat.valeurs?.['prix'] ?? ''}
              aide="En francs rwandais, sans décimale."
              erreur={etat.erreurs?.['prix']}
            />
            <Champ
              id="stock"
              label="Stock initial"
              inputMode="numeric"
              required
              defaultValue={etat.valeurs?.['stock'] ?? ''}
              aide="Quantité réellement disponible."
              erreur={etat.erreurs?.['stock']}
            />
          </div>
        </Section>

        <Section
          titre="Couleurs"
          aide="Écrivez chaque couleur puis ajoutez-la. Vous pourrez en ajouter, en retirer et régler leur stock depuis la fiche du produit."
        >
          <SaisieCouleurs defaut={etat.valeurs?.['couleurs'] ?? ''} />
        </Section>

        <Section titre="Classement">
          <div>
            <label htmlFor="categoryId" className="text-content block text-sm font-medium">
              Catégorie
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={etat.valeurs?.['categoryId'] ?? ''}
              className="border-border bg-surface text-content rounded-control focus:border-gold-400 mt-1 w-full border px-3 py-2.5 text-sm transition-colors outline-none"
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
        </Section>
      </div>

      {/* ——— Colonne de droite : les photos, puis l'envoi ——— */}
      <div className="space-y-5">
        <Section
          titre="Photos"
          aide={
            stockageActif
              ? 'La première photo devient la vignette de la boutique. Vous pourrez en ajouter, en retirer et changer la principale depuis la fiche.'
              : undefined
          }
        >
          {stockageActif ? (
            <SelecteurPhotos name="photos" label="Choisir les photos" />
          ) : (
            <p className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control border px-3 py-2 text-xs">
              Le stockage des images n’est pas configuré : créez un magasin Blob sur Vercel et
              renseignez <span className="font-mono">BLOB_READ_WRITE_TOKEN</span>. Le produit peut
              être créé sans photo, et complété ensuite.
            </p>
          )}
        </Section>

        <div className="space-y-3">
          <p className="border-border text-content-muted rounded-control border border-dashed px-4 py-3 text-xs">
            Le produit sera créé <strong className="text-content">en brouillon</strong>, avec une
            variante par défaut. Il n’apparaît dans la boutique qu’une fois passé « En vente »
            depuis sa fiche.
          </p>

          {etat.erreurs?.['general'] ? (
            <p role="alert" className="text-danger-500 text-sm font-medium">
              {etat.erreurs['general']}
            </p>
          ) : null}

          {etat.erreurs?.['photos'] ? (
            <p
              role="alert"
              className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control border px-3 py-2 text-xs"
            >
              {etat.erreurs['photos']}
            </p>
          ) : null}

          <Bouton />
        </div>
      </div>
    </form>
  );
}
