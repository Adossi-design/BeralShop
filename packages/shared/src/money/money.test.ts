import { describe, expect, it } from 'vitest';

import { applyRounding, convert } from './convert.ts';
import { discountPercent, formatMoney } from './format.ts';
import {
  MoneyError,
  add,
  allocate,
  allocateByWeights,
  clampToZero,
  fromMajor,
  money,
  multiply,
  percentage,
  subtract,
  sum,
  toMajor,
} from './money.ts';

describe('construction', () => {
  it('refuse un montant décimal — la cause classique des écarts de caisse', () => {
    expect(() => money(15.5, 'RWF')).toThrow(MoneyError);
  });

  it('convertit une unité principale selon l’exposant de la devise', () => {
    expect(fromMajor(1500, 'RWF').amountMinor).toBe(1500); // exposant 0
    expect(fromMajor(15.5, 'USD').amountMinor).toBe(1550); // exposant 2
    expect(toMajor(money(1550, 'USD'))).toBe(15.5);
  });
});

describe('arithmétique', () => {
  it('interdit de mélanger deux devises', () => {
    expect(() => add(money(100, 'RWF'), money(100, 'USD'))).toThrow(MoneyError);
  });

  it('additionne, soustrait et multiplie sans perte', () => {
    expect(add(money(1200, 'RWF'), money(800, 'RWF')).amountMinor).toBe(2000);
    expect(subtract(money(1200, 'RWF'), money(800, 'RWF')).amountMinor).toBe(400);
    expect(multiply(money(2500, 'RWF'), 3).amountMinor).toBe(7500);
  });

  it('ne dérive pas là où les nombres à virgule échouent (0.1 + 0.2)', () => {
    const total = sum([fromMajor(0.1, 'USD'), fromMajor(0.2, 'USD')], 'USD');
    expect(total.amountMinor).toBe(30);
    expect(toMajor(total)).toBe(0.3);
  });

  it('empêche un total négatif après une remise trop forte', () => {
    const afterDiscount = subtract(money(1000, 'RWF'), money(1500, 'RWF'));
    expect(clampToZero(afterDiscount).amountMinor).toBe(0);
  });

  it('calcule un pourcentage', () => {
    expect(percentage(money(10_000, 'RWF'), 3.5).amountMinor).toBe(350);
  });
});

describe('répartition', () => {
  it('ventile sans perdre ni créer une unité', () => {
    const parts = allocate(money(1000, 'RWF'), 3);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(parts.reduce((acc, p) => acc + p.amountMinor, 0)).toBe(1000);
  });

  it('ventile proportionnellement au poids des lignes', () => {
    const parts = allocateByWeights(money(1000, 'RWF'), [1, 1, 2]);
    expect(parts.reduce((acc, p) => acc + p.amountMinor, 0)).toBe(1000);
    expect(parts[2]!.amountMinor).toBeGreaterThan(parts[0]!.amountMinor);
  });
});

describe('arrondi commercial', () => {
  it('arrondit les francs au multiple de 100 supérieur', () => {
    expect(applyRounding(12_347, 'RWF', 'up_100')).toBe(12_400);
    expect(applyRounding(12_400, 'RWF', 'up_100')).toBe(12_400);
  });

  it('arrondit les FCFA au multiple de 25 supérieur', () => {
    expect(applyRounding(6213, 'XAF', 'up_25')).toBe(6225);
  });

  it('applique l’arrondi « x,99 » aux devises à décimales', () => {
    expect(applyRounding(1943, 'USD', 'up_99')).toBe(1999);
    expect(applyRounding(2000, 'USD', 'up_99')).toBe(2099);
  });

  it('ignore l’arrondi « x,99 » pour une devise sans décimale', () => {
    expect(applyRounding(1943, 'RWF', 'up_99')).toBe(1943);
  });
});

describe('conversion', () => {
  it('refuse un taux invalide plutôt que d’afficher un prix faux', () => {
    expect(() => convert(money(10_000, 'RWF'), 'USD', 0)).toThrow(MoneyError);
    expect(() => convert(money(10_000, 'RWF'), 'USD', Number.NaN)).toThrow(MoneyError);
  });

  it('ne touche pas au montant si la devise est identique', () => {
    const result = convert(money(10_000, 'RWF'), 'RWF', 0.00076);
    expect(result.amount.amountMinor).toBe(10_000);
    expect(result.marginPercent).toBe(0);
  });

  it('applique la marge de sécurité puis l’arrondi commercial', () => {
    // 10 000 Frw × 0,00076 = 7,60 $ ; +3 % = 7,828 $ ; arrondi « x,99 » → 7,99 $
    const result = convert(money(10_000, 'RWF'), 'USD', 0.00076);
    expect(result.amount.amountMinor).toBe(799);
    expect(result.amount.currency).toBe('USD');
    expect(result.rate).toBe(0.00076);
  });

  it('convertit vers le FCFA avec arrondi à 25', () => {
    const result = convert(money(10_000, 'RWF'), 'XAF', 0.44, { marginPercent: 0 });
    expect(result.amount.amountMinor % 25).toBe(0);
  });
});

describe('affichage', () => {
  it('place le symbole selon la convention locale', () => {
    expect(formatMoney(money(12_400, 'RWF'), 'fr')).toContain('Frw');
    expect(formatMoney(money(1999, 'USD'), 'en')).toBe('$19.99');
  });

  it('calcule le pourcentage de remise affiché sur la fiche produit', () => {
    expect(discountPercent(money(7500, 'RWF'), money(10_000, 'RWF'))).toBe(25);
    expect(discountPercent(money(10_000, 'RWF'), money(7500, 'RWF'))).toBeNull();
  });
});
