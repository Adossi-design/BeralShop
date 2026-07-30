import { describe, expect, it } from 'vitest';

import { estRejouable, rejouerSiReveil } from './retry.ts';

function erreurPrisma(code: string): Error & { code: string } {
  return Object.assign(new Error(`erreur simulée ${code}`), { code });
}

/** Attente instantanée : le test ne doit pas dormir réellement. */
const sansAttente = async (): Promise<void> => {};

describe('estRejouable', () => {
  it('accepte les échecs survenus avant toute exécution SQL', () => {
    expect(estRejouable(erreurPrisma('P1001'))).toBe(true); // serveur injoignable
    expect(estRejouable(erreurPrisma('P2024'))).toBe(true); // pool saturé
    expect(estRejouable(erreurPrisma('P2039'))).toBe(true); // authentification expirée
  });

  /**
   * Le test qui protège l'argent. P1017 signifie que le serveur a fermé la
   * connexion — possiblement APRÈS avoir exécuté la requête. Le rejouer créerait
   * une seconde commande. Si quelqu'un ajoute P1017 à la liste, ce test doit
   * tomber.
   */
  it('refuse P1017 : la requête a pu être exécutée avant la coupure', () => {
    expect(estRejouable(erreurPrisma('P1017'))).toBe(false);
  });

  it('refuse les erreurs métier, qui ne sont pas des pannes de connexion', () => {
    expect(estRejouable(erreurPrisma('P2002'))).toBe(false); // contrainte d'unicité
    expect(estRejouable(erreurPrisma('P2025'))).toBe(false); // enregistrement absent
  });

  it('ne se laisse pas piéger par une valeur sans code', () => {
    expect(estRejouable(new Error('panne réseau'))).toBe(false);
    expect(estRejouable(null)).toBe(false);
    expect(estRejouable(undefined)).toBe(false);
    expect(estRejouable('P1001')).toBe(false); // une chaîne n'est pas une erreur
    expect(estRejouable({ code: 1001 })).toBe(false); // code numérique
  });
});

describe('rejouerSiReveil', () => {
  it("n'appelle qu'une fois quand tout va bien", async () => {
    let appels = 0;
    const r = await rejouerSiReveil(async () => {
      appels += 1;
      return 'ok';
    }, sansAttente);

    expect(r).toBe('ok');
    expect(appels).toBe(1);
  });

  it('rejoue et finit par réussir — le cas du réveil de Neon', async () => {
    let appels = 0;
    const r = await rejouerSiReveil(async () => {
      appels += 1;
      if (appels < 3) throw erreurPrisma('P2039');
      return 'réveillée';
    }, sansAttente);

    expect(r).toBe('réveillée');
    expect(appels).toBe(3);
  });

  it('abandonne après deux reprises et propage l’erreur d’origine', async () => {
    let appels = 0;
    const echec = rejouerSiReveil(async () => {
      appels += 1;
      throw erreurPrisma('P1001');
    }, sansAttente);

    await expect(echec).rejects.toThrow('erreur simulée P1001');
    expect(appels).toBe(3); // 1 tentative + 2 reprises
  });

  it('ne rejoue JAMAIS une erreur non rejouable', async () => {
    let appels = 0;
    const echec = rejouerSiReveil(async () => {
      appels += 1;
      throw erreurPrisma('P1017');
    }, sansAttente);

    await expect(echec).rejects.toThrow('erreur simulée P1017');
    expect(appels).toBe(1);
  });

  it('respecte les délais annoncés, dans l’ordre', async () => {
    const attentes: number[] = [];
    const echec = rejouerSiReveil(
      async () => {
        throw erreurPrisma('P2024');
      },
      async (ms) => {
        attentes.push(ms);
      },
    );

    await expect(echec).rejects.toThrow();
    expect(attentes).toEqual([250, 1000]);
  });
});
