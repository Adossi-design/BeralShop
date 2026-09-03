'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Saisie des couleurs d'un produit, une par une.
 *
 * POURQUOI PAS UN SEUL CHAMP SÉPARÉ PAR DES VIRGULES
 * C'était la première version, et elle demandait au propriétaire de connaître
 * une convention : « Noir, Blanc, Orange ». Une virgule oubliée et deux couleurs
 * n'en faisaient qu'une ; un nom contenant lui-même une virgule était coupé en
 * deux. Surtout, rien ne montrait ce qui avait été compris avant de valider.
 *
 * Ici, chaque couleur s'écrit puis s'ajoute. Elle apparaît alors comme une
 * étiquette qu'on peut retirer : ce qui est à l'écran est exactement ce qui
 * partira au serveur, et cela se relit d'un coup d'œil.
 *
 * ENTRÉE AJOUTE LA COULEUR, ELLE NE VALIDE PAS LE FORMULAIRE. Sans cette
 * interception, taper « Noir » puis Entrée créait le produit — sans la couleur,
 * puisqu'elle n'avait pas encore été ajoutée. Le réflexe est trop courant pour
 * qu'on le laisse coûter une fiche à refaire.
 */

export function SaisieCouleurs({
  name = 'couleurs',
  defaut = '',
}: {
  readonly name?: string;
  /** Valeurs à restaurer après un échec de validation du formulaire. */
  readonly defaut?: string;
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
        Couleurs proposées
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
          placeholder="Noir"
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

      {couleurs.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {couleurs.map((couleur, index) => (
            <li
              key={couleur}
              className="border-gold-300 bg-gold-50 text-content rounded-control flex items-center gap-1.5 border px-2.5 py-1 text-sm"
            >
              {/* Un champ caché par couleur : le serveur lit la liste avec
                  `getAll`, sans avoir à redécouper quoi que ce soit. */}
              <input type="hidden" name={name} value={couleur} />
              {couleur}
              <button
                type="button"
                onClick={() => setCouleurs(couleurs.filter((_, i) => i !== index))}
                aria-label={`Retirer ${couleur}`}
                className="text-content-muted hover:text-danger-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-content-muted mt-2 text-xs">
        {couleurs.length === 0
          ? 'Laissez vide si le produit n’a qu’une seule couleur.'
          : `${couleurs.length} couleur${couleurs.length > 1 ? 's' : ''} — une variante sera créée pour chacune, avec le stock indiqué plus haut.`}
      </p>
    </div>
  );
}
