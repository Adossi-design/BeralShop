'use client';

import { useMemo, useState } from 'react';
import { Check, Minus, Plus, ShoppingCart, Zap } from 'lucide-react';

import type { VariantView } from '@beralshopp/core';

import { Price } from './price';

/**
 * Choix de la variante et de la quantité.
 *
 * Seul composant client de la fiche produit : tout le reste est rendu sur le serveur.
 * C'est délibéré — n'envoyer au navigateur que le JavaScript strictement nécessaire
 * est ce qui tient la cible de performance sur téléphone d'entrée de gamme.
 *
 * Les boutons d'achat sont présents mais inactifs : le panier arrive au lot 4.
 * Ils sont explicitement désactivés plutôt que masqués, pour valider dès maintenant
 * la mise en page définitive.
 */

interface VariantPickerProps {
  readonly variants: readonly VariantView[];
  readonly optionNames: readonly string[];
}

export function VariantPicker({ variants, optionNames }: VariantPickerProps) {
  const [selectedId, setSelectedId] = useState<string>(
    // On présélectionne la première variante DISPONIBLE : ouvrir une fiche sur une
    // couleur en rupture donne l'impression que le produit entier est indisponible.
    () => (variants.find((v) => v.isAvailable) ?? variants[0])?.id ?? '',
  );
  const [quantity, setQuantity] = useState(1);

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId],
  );

  /** Valeurs possibles pour chaque axe de choix, dans l'ordre de première apparition. */
  const optionValues = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const name of optionNames) {
      const values: string[] = [];
      for (const variant of variants) {
        const value = variant.options[name];
        if (value && !values.includes(value)) values.push(value);
      }
      map.set(name, values);
    }
    return map;
  }, [variants, optionNames]);

  /** Variante correspondant au choix courant, avec une seule valeur modifiée. */
  function variantFor(name: string, value: string): VariantView | undefined {
    if (!selected) return undefined;
    const target = { ...selected.options, [name]: value };
    return variants.find((variant) =>
      optionNames.every((option) => variant.options[option] === target[option]),
    );
  }

  if (!selected) return null;

  const maxQuantity = Math.min(selected.availableQuantity, 99);
  const isOutOfStock = !selected.isAvailable;
  const isLowStock = selected.availableQuantity > 0 && selected.availableQuantity <= 5;

  return (
    <div className="flex flex-col gap-5">
      <Price price={selected.price} size="lg" />

      {/* ——— Axes de choix ——— */}
      {optionNames.map((name) => (
        <fieldset key={name}>
          <legend className="text-content mb-2 text-sm font-medium">
            {name} :{' '}
            <span className="text-content-muted font-normal">{selected.options[name]}</span>
          </legend>

          <div className="flex flex-wrap gap-2">
            {(optionValues.get(name) ?? []).map((value) => {
              const candidate = variantFor(name, value);
              const isSelected = selected.options[name] === value;
              const isUnavailable = !candidate || !candidate.isAvailable;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (candidate) {
                      setSelectedId(candidate.id);
                      setQuantity(1);
                    }
                  }}
                  disabled={!candidate}
                  aria-pressed={isSelected}
                  className={`rounded-control relative border px-3.5 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border-ink-900 bg-gold-50 text-gold-800 font-semibold'
                      : 'border-border text-content hover:border-gold-400'
                  } ${isUnavailable ? 'opacity-45' : ''} disabled:cursor-not-allowed`}
                >
                  {isSelected ? <Check className="me-1 inline h-3.5 w-3.5" aria-hidden /> : null}
                  {value}
                  {isUnavailable ? (
                    <span className="text-content-muted ms-1 text-xs">(épuisé)</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* ——— Disponibilité ——— */}
      <p className="text-sm">
        {isOutOfStock ? (
          <span className="text-danger-500 font-medium">Rupture de stock</span>
        ) : isLowStock ? (
          <span className="text-warning-500 font-medium">
            Plus que {selected.availableQuantity} en stock
          </span>
        ) : (
          <span className="text-success-500 font-medium">En stock</span>
        )}
        <span className="text-content-muted ms-2 text-xs">Réf. {selected.sku}</span>
      </p>

      {/* ——— Quantité ——— */}
      <div className="flex items-center gap-3">
        <span className="text-content text-sm font-medium">Quantité</span>
        <div className="border-border rounded-control inline-flex items-center border">
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.max(1, n - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            aria-label="Diminuer la quantité"
            className="hover:bg-surface-muted px-3 py-2 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="beral-price w-10 text-center text-sm font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.min(maxQuantity, n + 1))}
            disabled={quantity >= maxQuantity || isOutOfStock}
            aria-label="Augmenter la quantité"
            className="hover:bg-surface-muted px-3 py-2 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* ——— Achat (actif au lot 4) ——— */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled
          className="beral-btn-gold rounded-control inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          Ajouter au panier
        </button>
        <button
          type="button"
          disabled
          className="bg-ink-900 rounded-control inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Zap className="h-5 w-5" aria-hidden />
          Acheter maintenant
        </button>
      </div>

      <p className="text-content-muted text-xs">
        Le panier et le paiement sont en cours de développement (lots 4 à 6).
      </p>
    </div>
  );
}
