import { describe, expect, it } from 'vitest';

import { buildFromPriceView, buildPriceView } from './product-price.ts';

describe('prix produit', () => {
  it('sans ancien prix, aucune promotion', () => {
    const view = buildPriceView({ basePriceMinor: 15_000, compareAtPriceMinor: null });
    expect(view.amount.amountMinor).toBe(15_000);
    expect(view.compareAt).toBeNull();
    expect(view.isOnSale).toBe(false);
  });

  it('calcule la remise affichée', () => {
    const view = buildPriceView({ basePriceMinor: 15_000, compareAtPriceMinor: 22_000 });
    expect(view.isOnSale).toBe(true);
    expect(view.discountPercent).toBe(32);
  });

  it("ignore un « ancien prix » inférieur au prix courant plutôt que d'afficher une remise négative", () => {
    // Cas réel : un administrateur augmente un prix sans retirer le prix barré.
    const view = buildPriceView({ basePriceMinor: 20_000, compareAtPriceMinor: 15_000 });
    expect(view.isOnSale).toBe(false);
    expect(view.compareAt).toBeNull();
  });

  it('applique l’écart de variante au prix ET à l’ancien prix', () => {
    const view = buildPriceView({
      basePriceMinor: 35_000,
      compareAtPriceMinor: 48_000,
      variantDeltaMinor: 2000,
    });
    expect(view.amount.amountMinor).toBe(37_000);
    expect(view.compareAt?.amountMinor).toBe(50_000);
    // Sans report de l'écart sur l'ancien prix, la remise affichée serait fausse.
    expect(view.discountPercent).toBe(26);
  });

  it('accepte un écart de variante négatif', () => {
    const view = buildPriceView({
      basePriceMinor: 9000,
      compareAtPriceMinor: null,
      variantDeltaMinor: -1500,
    });
    expect(view.amount.amountMinor).toBe(7500);
  });
});

describe('prix d’appel « à partir de »', () => {
  it('retient la variante la moins chère et signale la disparité', () => {
    const view = buildFromPriceView(
      { basePriceMinor: 9000, compareAtPriceMinor: null },
      [0, 1000, 2000],
    );
    expect(view.amount.amountMinor).toBe(9000);
    expect(view.hasMultiplePrices).toBe(true);
  });

  it('ne signale aucune disparité quand toutes les variantes ont le même prix', () => {
    const view = buildFromPriceView({ basePriceMinor: 9000, compareAtPriceMinor: null }, [0, 0]);
    expect(view.hasMultiplePrices).toBe(false);
  });

  it('gère un produit sans variante', () => {
    const view = buildFromPriceView({ basePriceMinor: 12_000, compareAtPriceMinor: null }, []);
    expect(view.amount.amountMinor).toBe(12_000);
    expect(view.hasMultiplePrices).toBe(false);
  });
});
