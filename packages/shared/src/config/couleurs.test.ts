import { describe, expect, it } from 'vitest';

import { teinteDe, teinteTresClaire } from './couleurs.ts';

describe('teinteDe', () => {
  it('reconnaît les noms usuels, en français comme en anglais', () => {
    expect(teinteDe('Noir')).toBe('#111111');
    expect(teinteDe('black')).toBe('#111111');
    expect(teinteDe('Rouge')).toBe('#dc2626');
  });

  it('ignore la casse et les accents', () => {
    expect(teinteDe('DORÉ')).toBe('#c9963c');
    expect(teinteDe('doré')).toBe(teinteDe('dore'));
  });

  it('préfère le mot le plus long dans un libellé composé', () => {
    // « marine » doit l'emporter sur « bleu », sinon le bleu vif gagnerait par
    // simple ordre de lecture.
    expect(teinteDe('Bleu marine')).toBe('#1e3a5f');
    expect(teinteDe('Bleu')).toBe('#2563eb');
  });

  it('laisse le code écrit à la main primer sur le nom', () => {
    expect(teinteDe('Bleu #123456')).toBe('#123456');
    expect(teinteDe('Sable #d8c9a3')).toBe('#d8c9a3');
    expect(teinteDe('Sable #abc')).toBe('#abc');
  });

  it('rend null sur une couleur inconnue plutôt qu’une teinte par défaut', () => {
    // Un gris posé au hasard ferait croire que l'article est gris.
    expect(teinteDe('Tourterelle')).toBeNull();
    expect(teinteDe('')).toBeNull();
  });

  it('ne confond pas un mot avec un fragment d’un autre', () => {
    // « or » ne doit pas s'allumer dans « Bordeaux ».
    expect(teinteDe('Bordeaux')).toBe('#7f1d1d');
  });
});

describe('teinteTresClaire', () => {
  it('repère les teintes qui disparaîtraient sur fond blanc', () => {
    expect(teinteTresClaire('#ffffff')).toBe(true);
    expect(teinteTresClaire('#fffff0')).toBe(true);
    expect(teinteTresClaire('#111111')).toBe(false);
    expect(teinteTresClaire('#dc2626')).toBe(false);
  });

  it('accepte la notation courte', () => {
    expect(teinteTresClaire('#fff')).toBe(true);
    expect(teinteTresClaire('#000')).toBe(false);
  });
});
