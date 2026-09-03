'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { SelecteurPhotos } from './selecteur-photos';

/**
 * Saisie des couleurs d'un produit, une par une, CHACUNE AVEC SES PHOTOS.
 *
 * POURQUOI CHAQUE COULEUR PORTE SES PROPRES PHOTOS
 * On photographie un article couleur par couleur : la version blanche et la
 * version noire n'ont rien à voir à l'écran. Tant que les photos étaient
 * communes au produit, il fallait créer la fiche, puis revenir déclinaison par
 * déclinaison — et le client qui choisissait « Blanc » voyait défiler les photos
 * du modèle noir.
 *
 * Ici, on écrit une couleur, on l'ajoute, on dépose ses photos ; puis la
 * suivante. Tout part dans le MÊME envoi. Le nom du champ de photos porte le
 * RANG de la couleur, pas son libellé : une teinte peut s'appeler « Bleu / vert
 * d'eau », et un nom de champ construit sur un libellé libre finirait par se
 * casser sur un caractère inattendu.
 *
 * POURQUOI PAS UN SEUL CHAMP SÉPARÉ PAR DES VIRGULES
 * C'était la première version. Elle demandait de connaître une convention : une
 * virgule oubliée et deux teintes n'en faisaient qu'une ; un nom contenant
 * lui-même une virgule était coupé en deux. Surtout, rien ne montrait ce qui
 * avait été compris avant de valider.
 *
 * ENTRÉE AJOUTE LA COULEUR, ELLE NE VALIDE PAS LE FORMULAIRE. Sans cette
 * interception, taper « Noir » puis Entrée créait le produit — sans la couleur,
 * puisqu'elle n'avait pas encore été ajoutée.
 */

export function SaisieCouleurs({
  name = 'couleurs',
  defaut = '',
  stockageActif = true,
}: {
  readonly name?: string;
  /** Valeurs à restaurer après un échec de validation du formulaire. */
  readonly defaut?: string;
  readonly stockageActif?: boolean;
}) {
  const [couleurs, setCouleurs] = useState<readonly string[]>(() =>
    defaut
      .split(/[,;\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0),
  );
  const [saisie, setSaisie] = useState('');

  function ajouter(): void {
    const valeur = saisie.trim();
    if (valeur.length === 0) return;

    /* Comparaison insensible à la casse : « noir » et « Noir » désignent la même
       teinte, et deux variantes homonymes rendraient le choix impossible côté
       boutique. La première graphie saisie est conservée. */
    const deja = couleurs.some((c) => c.toLowerCase() === valeur.toLowerCase());
    if (!deja) setCouleurs([...couleurs, valeur]);
    setSaisie('');
  }

  return (
    <div>
      <label htmlFor={`${name}-saisie`} className="text-content block text-sm font-medium">
        Ajouter une couleur
      </label>

      <div className="mt-1 flex gap-2">
        <input
          id={`${name}-saisie`}
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="Blanc"
          maxLength={40}
          className="border-border bg-surface text-content rounded-control focus:border-gold-400 min-w-0 flex-1 border px-3 py-2.5 text-sm transition-colors outline-none"
        />
        <button
          type="button"
          onClick={ajouter}
          disabled={saisie.trim().length === 0}
          className="border-border text-content hover:border-gold-400 rounded-control inline-flex shrink-0 items-center gap-1 border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter
        </button>
      </div>

      {couleurs.length === 0 ? (
        <p className="text-content-muted mt-2 text-xs">
          Laissez vide si le produit n’a qu’une seule couleur. Ses photos se déposent alors dans le
          cadre « Photos », à droite.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {couleurs.map((couleur, index) => (
            <li key={couleur} className="border-border rounded-card border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="border-gold-300 bg-gold-50 text-content rounded-control inline-flex items-center border px-2.5 py-1 text-sm font-medium">
                  {/* Un champ caché par couleur : le serveur lit la liste avec
                      `getAll`, sans avoir à redécouper quoi que ce soit. */}
                  <input type="hidden" name={name} value={couleur} />
                  {couleur}
                </span>
                <button
                  type="button"
                  onClick={() => setCouleurs(couleurs.filter((_, i) => i !== index))}
                  aria-label={`Retirer ${couleur}`}
                  className="text-content-muted hover:text-danger-500 inline-flex items-center gap-1 text-xs transition-colors"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Retirer
                </button>
              </div>

              {stockageActif ? (
                <div className="mt-3">
                  <SelecteurPhotos
                    name={`photos_${index}`}
                    label={`Photos du modèle ${couleur}`}
                    aide="Ces photos ne s’afficheront que pour cette couleur."
                    vitrineParDefaut={-1}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {couleurs.length > 0 ? (
        <p className="text-content-muted mt-2 text-xs">
          {couleurs.length} couleur{couleurs.length > 1 ? 's' : ''} — une déclinaison sera créée
          pour chacune, avec le stock indiqué plus haut.
        </p>
      ) : null}
    </div>
  );
}
