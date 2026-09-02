'use client';

import { useActionState } from 'react';
import { AlertTriangle, ImagePlus } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import type { ImageProduit } from '@beralshopp/core';

import { type AdminActionState, televerserImagesAction } from '@/lib/admin-actions';

import { SelecteurPhotos } from './selecteur-photos';

/**
 * Photos d'un produit déjà créé.
 *
 * UNE SEULE INTERFACE DE PHOTOS DANS TOUT L'ESPACE D'ADMINISTRATION. Ce fichier
 * n'a plus de mise en forme propre : il pose le cadre, le formulaire et le
 * bouton d'envoi, et délègue TOUT le reste à `SelecteurPhotos` — le même
 * composant, exactement, que celui du formulaire de création.
 *
 * Auparavant il existait deux écrans de photos qui ne se ressemblaient pas :
 * cadres différents, libellés différents, boutons ailleurs. On croyait devoir
 * recommencer le travail déjà fait à la création. La seule différence légitime
 * est qu'ici des photos existent déjà — le composant les montre, dans le même
 * bloc que celles qu'on ajoute.
 */

const INITIAL: AdminActionState = {};

function BoutonEnvoyer({ actif }: { readonly actif: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !actif}
      className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ImagePlus className="h-4 w-4" aria-hidden />
      {pending ? 'Envoi…' : 'Enregistrer les photos'}
    </button>
  );
}

export function ProductImages({
  productId,
  images,
  stockageActif,
}: {
  readonly productId: string;
  readonly images: readonly ImageProduit[];
  readonly stockageActif: boolean;
}) {
  const [etat, action] = useActionState(televerserImagesAction, INITIAL);

  return (
    <section className="border-border bg-surface rounded-card shadow-card border p-5">
      <h2 className="border-gold-400 text-content-muted border-s-2 ps-2 text-[0.65rem] font-semibold tracking-wider uppercase">
        Photos
      </h2>
      <p className="text-content-muted mt-2 text-xs">
        La photo marquée « Vitrine » est celle qui s’affiche dans la boutique.
      </p>

      {!stockageActif ? (
        <p className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control mt-4 flex items-start gap-2 border px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Le stockage des images n’est pas encore configuré : l’envoi échouera. Créez un magasin
            Blob depuis votre tableau de bord Vercel, puis renseignez la variable{' '}
            <span className="font-mono">BLOB_READ_WRITE_TOKEN</span>.
          </span>
        </p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="productId" value={productId} />

        <SelecteurPhotos
          name="fichiers"
          label="Photos du produit"
          existantes={images}
          productId={productId}
        />

        <div>
          <label htmlFor="altText" className="text-content block text-sm font-medium">
            Description de l’image (facultative)
          </label>
          <input
            id="altText"
            name="altText"
            type="text"
            maxLength={160}
            className="border-border bg-surface text-content rounded-control focus:border-gold-400 mt-1 w-full max-w-md border px-3 py-2 text-sm transition-colors outline-none"
          />
          <p className="text-content-muted mt-1 text-xs">
            Lue à voix haute aux personnes malvoyantes, et utilisée par Google.
          </p>
        </div>

        {etat.error ? (
          <p role="alert" className="text-danger-500 text-sm font-medium">
            {etat.error}
          </p>
        ) : null}
        {etat.success ? (
          <p role="status" className="text-success-500 text-sm font-medium">
            {etat.success}
          </p>
        ) : null}

        <BoutonEnvoyer actif={stockageActif} />
      </form>
    </section>
  );
}
