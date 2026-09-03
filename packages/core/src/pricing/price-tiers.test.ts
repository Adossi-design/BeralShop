import { describe, expect, it } from 'vitest';

import { type PalierPrix, grillePaliers, prixUnitaireMinor } from './price-tiers.ts';

/** La grille de l'exemple : 1 → 5234, 10 → 5126, 50 → 5018. */
const PALIERS: readonly PalierPrix[] = [
  { minQuantity: 10, unitPriceMinor: 5126 },
  { minQuantity: 1, unitPriceMinor: 5234 },
  { minQuantity: 50, unitPriceMinor: 5018 },
];

describe('prixUnitaireMinor', () => {
  it('retient le prix de base quand aucun palier n’est défini', () => {
    expect(prixUnitaireMinor(5234, 0, 40, [])).toBe(5234);
  });

  it('retient le palier atteint, pas le suivant', () => {
    expect(prixUnitaireMinor(9999, 0, 1, PALIERS)).toBe(5234);
    expect(prixUnitaireMinor(9999, 0, 9, PALIERS)).toBe(5234);
    expect(prixUnitaireMinor(9999, 0, 10, PALIERS)).toBe(5126);
    expect(prixUnitaireMinor(9999, 0, 49, PALIERS)).toBe(5126);
    expect(prixUnitaireMinor(9999, 0, 50, PALIERS)).toBe(5018);
    expect(prixUnitaireMinor(9999, 0, 1000, PALIERS)).toBe(5018);
  });

  it('ne dépend pas de l’ordre dans lequel les paliers arrivent', () => {
    const inverse = [...PALIERS].reverse();
    expect(prixUnitaireMinor(9999, 0, 20, inverse)).toBe(prixUnitaireMinor(9999, 0, 20, PALIERS));
  });

  it('ajoute l’écart de variante À TOUS les paliers', () => {
    // Une couleur qui coûte 2 000 de plus les coûte aussi en gros.
    expect(prixUnitaireMinor(5234, 2000, 1, PALIERS)).toBe(7234);
    expect(prixUnitaireMinor(5234, 2000, 50, PALIERS)).toBe(7018);
  });

  it('ignore les paliers incohérents plutôt que de les deviner', () => {
    const fautifs: readonly PalierPrix[] = [
      { minQuantity: 0, unitPriceMinor: 1 },
      { minQuantity: -5, unitPriceMinor: 1 },
      { minQuantity: 2.5, unitPriceMinor: 1 },
      { minQuantity: 10, unitPriceMinor: -300 },
    ];
    expect(prixUnitaireMinor(5234, 0, 100, fautifs)).toBe(5234);
  });

  it('ne descend jamais sous zéro', () => {
    expect(prixUnitaireMinor(5234, -9000, 1, PALIERS)).toBe(0);
  });
});

describe('grillePaliers', () => {
  it('ordonne par quantité croissante', () => {
    expect(grillePaliers(5234, 0, PALIERS).map((p) => p.minQuantity)).toEqual([1, 10, 50]);
  });

  it('ajoute le palier « 1 » quand il manque, au prix de base', () => {
    const sansUn: readonly PalierPrix[] = [{ minQuantity: 10, unitPriceMinor: 5126 }];
    expect(grillePaliers(5234, 0, sansUn)).toEqual([
      { minQuantity: 1, unitPriceMinor: 5234 },
      { minQuantity: 10, unitPriceMinor: 5126 },
    ]);
  });

  it('applique l’écart de variante à la grille affichée', () => {
    expect(grillePaliers(5234, 1000, PALIERS)).toEqual([
      { minQuantity: 1, unitPriceMinor: 6234 },
      { minQuantity: 10, unitPriceMinor: 6126 },
      { minQuantity: 50, unitPriceMinor: 6018 },
    ]);
  });

  it('n’invente aucun palier quand il n’y en a pas', () => {
    expect(grillePaliers(5234, 0, [])).toEqual([{ minQuantity: 1, unitPriceMinor: 5234 }]);
  });
});
