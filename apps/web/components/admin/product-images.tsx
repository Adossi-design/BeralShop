'use client';

import { useActionState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ImagePlus, Star, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import type { ImageProduit } from '@beralshopp/core';

import {
  type AdminActionState,
  imagePrincipaleAction,
  supprimerImageAction,
  televerserImagesAction,
} from '@/lib/admin-actions';

/**
 * Gestion des photos d'un produit.
 *
 * Téléversement multiple, suppression, choix de la vignette. L'image principale
 * est signalée par une étoile pleine : c'est elle qui apparaît partout dans la
 * boutique, et le propriétaire doit pouvoir la reconnaître d'un coup d'œil sans
 * ouvrir la fiche publique pour vérifier.
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
      {pending ? 'Envoi…' : 'Ajouter les photos'}
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
    <section className="border-border bg-surface rounded-card border p-5">
      <h2 className="text-content font-semibold">Photos du produit</h2>
      <p className="text-content-muted mt-1 text-sm">
        La photo marquée d’une étoile est celle qui s’affiche dans la boutique.
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

      {/* ——— Photos existantes ——— */}
      {images.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="border-border rounded-card group relative overflow-hidden border"
            >
              <div className="bg-surface-muted relative aspect-square">
                <Image
                  src={image.url}
                  alt={image.altText ?? ''}
                  fill
                  sizes="(max-width: 640px) 45vw, 200px"
                  className="object-cover"
                />
              </div>

              {image.isPrimary ? (
                <span className="beral-btn-gold absolute start-2 top-2 flex items-center gap-1 rounded px-2 py-0.5 text-[0.65rem] font-bold">
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  Principale
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-1 p-2">
                {!image.isPrimary ? (
                  <form action={imagePrincipaleAction}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <input type="hidden" name="productId" value={productId} />
                    <button
                      type="submit"
                      className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-xs transition-colors"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      Définir
                    </button>
                  </form>
                ) : (
                  <span />
                )}

                {/* Suppression en POST : un lien serait déclenché par un
                    préchargement du navigateur, sans clic de personne. */}
                <form action={supprimerImageAction}>
                  <input type="hidden" name="imageId" value={image.id} />
                  <input type="hidden" name="productId" value={productId} />
                  <button
                    type="submit"
                    aria-label="Supprimer cette photo"
                    className="text-content-muted hover:text-danger-500 inline-flex items-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-content-muted border-border rounded-card mt-4 border border-dashed px-4 py-6 text-center text-sm">
          Aucune photo. Ce produit s’affiche avec une pastille de substitution.
        </p>
      )}

      {/* ——— Ajout ——— */}
      <form action={action} className="border-border mt-5 space-y-3 border-t pt-5">
        <input type="hidden" name="productId" value={productId} />

        <div>
          <label htmlFor="fichiers" className="text-content block text-sm font-medium">
            Ajouter des photos
          </label>
          <input
            id="fichiers"
            name="fichiers"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            required
            className="text-content-muted file:beral-btn-gold file:rounded-control mt-1 block w-full text-sm file:mr-3 file:border-0 file:px-4 file:py-2 file:font-semibold"
          />
          <p className="text-content-muted mt-1 text-xs">
            JPEG, PNG, WebP ou AVIF. 6 Mo maximum par photo.
          </p>
        </div>

        <div>
          <label htmlFor="altText" className="text-content block text-sm font-medium">
            Description de l’image (facultative)
          </label>
          <input
            id="altText"
            name="altText"
            type="text"
            maxLength={160}
            className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-md border px-3 py-2 text-sm"
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
