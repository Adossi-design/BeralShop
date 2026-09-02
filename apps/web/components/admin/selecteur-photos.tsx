'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Plus, X } from 'lucide-react';

import {
  ACCEPT_PHOTO,
  TAILLE_MAX_ENVOI,
  TAILLE_MAX_PHOTO,
  TYPES_PHOTO_AUTORISES,
  formaterTaille,
} from '@beralshopp/shared';

/**
 * Choix des photos d'un produit, avec aperçu et refus expliqué.
 *
 * POURQUOI CE COMPOSANT EXISTE
 * Le champ de fichier nu envoyait la photo au serveur et attendait. Au-delà
 * d'une certaine taille, l'action serveur était rejetée AVANT d'atteindre le
 * code : ni image ajoutée, ni message d'erreur, ni erreur réseau. Le
 * propriétaire cliquait « Ajouter les photos » et regardait un écran qui ne
 * répondait pas. Mesuré : 4 ko passaient, 5,57 Mo ne faisaient rien.
 *
 * Le contrôle est donc fait ICI, avant tout envoi, et il EXPLIQUE. Il ne
 * remplace pas celui du serveur — un contrôle côté navigateur se contourne en
 * trois clics — il évite un aller-retour perdu et un silence.
 *
 * Les aperçus servent à autre chose qu'à faire joli : on téléverse rarement une
 * photo, souvent cinq, et on se trompe de fichier. Voir avant d'envoyer coûte
 * moins cher que supprimer après.
 */

interface Choisie {
  readonly fichier: File;
  readonly apercu: string;
  readonly probleme: string | null;
}

function examiner(fichier: File): string | null {
  if (!(TYPES_PHOTO_AUTORISES as readonly string[]).includes(fichier.type)) {
    return `format « ${fichier.type || 'inconnu'} » refusé`;
  }
  if (fichier.size === 0) return 'fichier vide';
  if (fichier.size > TAILLE_MAX_PHOTO) {
    return `${formaterTaille(fichier.size)} — maximum ${formaterTaille(TAILLE_MAX_PHOTO)}`;
  }
  return null;
}

export function SelecteurPhotos({
  name,
  label = 'Photos du produit',
  aide,
}: {
  /** Nom du champ envoyé au serveur. */
  readonly name: string;
  readonly label?: string;
  readonly aide?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const [choisies, setChoisies] = useState<readonly Choisie[]>([]);

  /**
   * Recopie la liste dans le champ, pour que le formulaire l'envoie.
   *
   * `input.files` n'est pas une liste ordinaire et ne s'écrit pas directement :
   * il faut passer par un `DataTransfer`. Sans cette recopie, l'écran
   * afficherait dix photos et le serveur n'en recevrait qu'une — le pire des
   * cas, puisque rien ne signalerait la perte.
   */
  function recopier(liste: readonly Choisie[]): void {
    if (!champ.current) return;
    try {
      const transfert = new DataTransfer();
      for (const c of liste) transfert.items.add(c.fichier);
      champ.current.files = transfert.files;
    } catch {
      /* Navigateur sans DataTransfer : le champ garde la dernière sélection.
         L'écran reste donc fidèle à ce qui partira réellement. */
    }
  }

  /** Deux fichiers sont le même s'ils ont même nom, même taille, même date. */
  const empreinte = (fichier: File): string =>
    `${fichier.name}|${fichier.size}|${fichier.lastModified}`;

  /**
   * LA SÉLECTION S'AJOUTE, ELLE NE REMPLACE PAS.
   *
   * Un champ de fichier remplace sa liste à chaque ouverture : on choisit une
   * photo, on rouvre pour en ajouter une seconde, et la première disparaît sans
   * un mot. C'est le comportement du navigateur, pas un réglage — il faut donc
   * tenir la liste soi-même et la recopier dans le champ.
   *
   * Sur un téléphone, cela change tout : la pellicule ne permet pas toujours de
   * cocher plusieurs photos d'un coup, et l'on ajoute forcément une par une.
   */
  function relire(): void {
    const nouveaux = Array.from(champ.current?.files ?? []);
    const connus = new Set(choisies.map((c) => empreinte(c.fichier)));

    const ajouts = nouveaux
      .filter((fichier) => !connus.has(empreinte(fichier)))
      .map((fichier) => ({
        fichier,
        apercu: URL.createObjectURL(fichier),
        probleme: examiner(fichier),
      }));

    const fusion = [...choisies, ...ajouts];
    recopier(fusion);
    setChoisies(fusion);
  }

  function retirer(index: number): void {
    const partante = choisies[index];
    /* L'URL d'aperçu de la SEULE photo retirée est révoquée : les autres
       restent affichées et en ont encore besoin. */
    if (partante) URL.revokeObjectURL(partante.apercu);
    const reste = choisies.filter((_, i) => i !== index);
    recopier(reste);
    setChoisies(reste);
  }

  function vider(): void {
    for (const c of choisies) URL.revokeObjectURL(c.apercu);
    if (champ.current) champ.current.value = '';
    setChoisies([]);
  }

  const total = choisies.reduce((s, c) => s + c.fichier.size, 0);
  const refusees = choisies.filter((c) => c.probleme !== null);
  const tropLourd = refusees.length === 0 && total > TAILLE_MAX_ENVOI;

  return (
    <div>
      <label htmlFor={name} className="text-content block text-sm font-medium">
        {label}
      </label>

      <input
        ref={champ}
        id={name}
        name={name}
        type="file"
        accept={ACCEPT_PHOTO}
        multiple
        onChange={relire}
        /* Le bouton natif est habille avec de VRAIES utilitaires. La variante
           `file:` ne sait pas composer une classe maison comme `beral-btn-gold` :
           elle ne genere une regle que pour un utilitaire connu de Tailwind. Le
           bouton restait donc gris, au milieu d un formulaire dore. */
        className="text-content-muted file:text-ink-950 file:bg-gold-400 hover:file:bg-gold-300 file:rounded-control mt-1 block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:border-0 file:px-4 file:py-2 file:font-semibold file:transition-colors"
      />

      <p className="text-content-muted mt-1 text-xs">
        {aide ?? 'JPEG, PNG, WebP ou AVIF.'} {formaterTaille(TAILLE_MAX_PHOTO)} maximum par photo.
        Vous pouvez en ajouter plusieurs d’un coup, ou revenir en ajouter d’autres : elles
        s’accumulent.
      </p>

      {choisies.length > 0 ? (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {choisies.map((c, index) => (
              <li
                key={empreinte(c.fichier)}
                className={`rounded-control group relative overflow-hidden border ${
                  c.probleme ? 'border-danger-500' : 'border-border'
                }`}
              >
                {/* Retrait unitaire : sans lui, une photo choisie par erreur
                    obligerait à tout vider et à tout reprendre. */}
                <button
                  type="button"
                  onClick={() => retirer(index)}
                  aria-label={`Retirer ${c.fichier.name}`}
                  className="bg-ink-900/80 hover:bg-ink-900 absolute end-1 top-1 z-10 rounded-full p-1 text-white transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
                <div className="bg-surface-muted relative aspect-square">
                  {/* Aperçu local : `next/image` ne sait pas traiter une URL
                      blob:, et il n'y a rien à optimiser sur un fichier qui ne
                      quittera peut-être jamais ce navigateur. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.apercu}
                    alt=""
                    className={`h-full w-full object-contain ${c.probleme ? 'opacity-40' : ''}`}
                  />
                </div>
                <p className="text-content-muted truncate px-1.5 py-1 text-[0.65rem]">
                  {c.probleme ? (
                    <span className="text-danger-500">{c.probleme}</span>
                  ) : (
                    formaterTaille(c.fichier.size)
                  )}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-content-muted text-xs">
              {choisies.length} photo{choisies.length > 1 ? 's' : ''} · {formaterTaille(total)}
            </p>
            <button
              type="button"
              onClick={() => champ.current?.click()}
              className="text-gold-700 hover:text-gold-800 inline-flex items-center gap-1 text-xs font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter d’autres photos
            </button>
            <button
              type="button"
              onClick={vider}
              className="text-content-muted hover:text-danger-500 inline-flex items-center gap-1 text-xs transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Tout retirer
            </button>
          </div>
        </>
      ) : null}

      {refusees.length > 0 ? (
        <p
          role="alert"
          className="border-danger-500/40 bg-danger-500/5 text-danger-500 rounded-control mt-2 flex items-start gap-2 border px-3 py-2 text-xs"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {refusees.length} photo{refusees.length > 1 ? 's' : ''} ne peu
            {refusees.length > 1 ? 'vent' : 't'} pas être envoyée{refusees.length > 1 ? 's' : ''}.
            Retirez-la{refusees.length > 1 ? 's' : ''} de la sélection ou redimensionnez-la
            {refusees.length > 1 ? 's' : ''}.
          </span>
        </p>
      ) : null}

      {tropLourd ? (
        <p
          role="alert"
          className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control mt-2 flex items-start gap-2 border px-3 py-2 text-xs"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Ces {choisies.length} photos pèsent {formaterTaille(total)} au total, au-delà de{' '}
            {formaterTaille(TAILLE_MAX_ENVOI)} par envoi. Envoyez-les en deux fois.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Icône exposée pour les boutons d'envoi, afin de garder un vocabulaire commun. */
export { ImagePlus as IconePhoto };
