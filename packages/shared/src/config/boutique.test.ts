import { describe, expect, it } from 'vitest';

import { BOUTIQUE, BOUTIQUE_LOCALISATION, coordonneesIncompletes } from './boutique.ts';

/**
 * Ces tests gardent les coordonnées réellement publiées aux clients.
 *
 * Ce ne sont pas des tests de forme : si l'un d'eux tombe, cela signifie que le
 * site affiche un numéro ou une adresse que personne ne peut joindre. Sur une
 * boutique, une question sans réponse devient un litige.
 */
describe('coordonnées de la boutique', () => {
  it('sont complètes et valides — la boutique peut être jointe', () => {
    expect(coordonneesIncompletes()).toEqual([]);
  });

  it('utilisent le format international, exigé par le lien WhatsApp', () => {
    // wa.me n'accepte que des chiffres : un espace ou un zéro initial casse le lien.
    expect(BOUTIQUE.whatsapp).toMatch(/^\+[1-9]\d{6,14}$/);
    expect(BOUTIQUE.whatsapp).not.toContain(' ');
  });

  it('affichent une localisation lisible dans le pied de page', () => {
    expect(BOUTIQUE_LOCALISATION).toBe('Kigali, Rwanda');
  });

  it('ne contiennent plus aucune marque de réservation', () => {
    const valeurs = [BOUTIQUE.telephone, BOUTIQUE.whatsapp, BOUTIQUE.email];
    for (const valeur of valeurs) {
      expect(valeur).not.toContain('...');
      expect(valeur).not.toContain('example');
    }
  });
});
