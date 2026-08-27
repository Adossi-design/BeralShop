import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';

import { type EntreeTerminal, type SortieTerminal, demanderMotDePasse } from './saisie-masquee.ts';

/**
 * Terminal simulé.
 *
 * Le vrai terminal ne peut pas être piloté depuis un test : on injecte donc des
 * flux, ce qui permet de vérifier NOIR SUR BLANC ce qui a été affiché.
 */
class FauxTerminal extends EventEmitter implements EntreeTerminal, SortieTerminal {
  readonly isTTY = true;
  brut = false;
  affiche = '';

  setRawMode(mode: boolean): void {
    this.brut = mode;
  }
  resume(): void {}
  pause(): void {}
  write(texte: string): void {
    this.affiche += texte;
  }

  /** Simule une frappe au clavier. */
  taper(touches: string): void {
    this.emit('data', Buffer.from(touches, 'utf8'));
  }
}

const ENTREE = '\r';
const CTRL_C = '\u0003';
const EFFACEMENT = '\u007f';

describe('demanderMotDePasse', () => {
  it('renvoie exactement ce qui a été tapé', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('Mot de passe : ', t, t);
    t.taper(`Kigali-2026!${ENTREE}`);

    await expect(promesse).resolves.toBe('Kigali-2026!');
  });

  /**
   * LE test de ce module. S'il tombe, le mot de passe de l'administrateur
   * s'affiche à l'écran et se retrouve dans l'historique du terminal.
   */
  it("n'affiche JAMAIS le mot de passe, seulement des points", async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('Mot de passe : ', t, t);
    t.taper(`SecretAbsolu${ENTREE}`);
    await promesse;

    expect(t.affiche).not.toContain('SecretAbsolu');
    expect(t.affiche).not.toContain('Secret');
    // L'invite, puis un point par caractère, puis le retour à la ligne.
    expect(t.affiche).toBe(`Mot de passe : ${'•'.repeat(12)}\n`);
  });

  it('gère le retour arrière sans laisser de trace du caractère effacé', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('> ', t, t);
    t.taper(`abcX${EFFACEMENT}d${ENTREE}`);

    await expect(promesse).resolves.toBe('abcd');
    expect(t.affiche).not.toContain('X');
  });

  it('ignore un retour arrière sur une saisie vide', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('> ', t, t);
    t.taper(`${EFFACEMENT}${EFFACEMENT}ok${ENTREE}`);

    await expect(promesse).resolves.toBe('ok');
  });

  it('interrompt sur Ctrl+C au lieu de l’avaler comme un caractère', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('> ', t, t);
    t.taper(`abc${CTRL_C}`);

    await expect(promesse).rejects.toThrow('Saisie annulée');
  });

  it('accepte une saisie arrivée en plusieurs paquets', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('> ', t, t);
    t.taper('Kig');
    t.taper('ali');
    t.taper(ENTREE);

    await expect(promesse).resolves.toBe('Kigali');
  });

  it('rend le terminal à son état normal et se détache une fois terminé', async () => {
    const t = new FauxTerminal();
    const promesse = demanderMotDePasse('> ', t, t);
    expect(t.brut).toBe(true); // mode brut pendant la saisie

    t.taper(`mdp${ENTREE}`);
    await promesse;

    expect(t.brut).toBe(false); // rendu au terminal
    expect(t.listenerCount('data')).toBe(0); // plus aucun écouteur résiduel
  });
});
