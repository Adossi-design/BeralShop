import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

/**
 * Lecture d'un secret au clavier SANS l'afficher.
 *
 * POURQUOI CE MODULE EXISTE
 * `readline.question` renvoie en écho ce qui est tapé. Pour le mot de passe d'un
 * compte qui donne accès à toutes les commandes et à tous les clients, cela le
 * laisserait lisible à l'écran, dans un partage d'écran, et dans l'historique de
 * défilement du terminal. On passe donc le terminal en mode brut pour intercepter
 * chaque touche et n'afficher qu'un point.
 *
 * Les flux sont des paramètres, et non les entrées/sorties globales : c'est ce qui
 * permet de VÉRIFIER par un test que le secret n'est jamais écrit à l'écran.
 * Un masquage non testé ne vaut pas mieux qu'un masquage absent.
 */

/** Interface minimale attendue — un flux d'entrée de terminal. */
export interface EntreeTerminal extends NodeJS.EventEmitter {
  readonly isTTY?: boolean | undefined;
  setRawMode?: (mode: boolean) => unknown;
  resume: () => unknown;
  pause: () => unknown;
}

export interface SortieTerminal {
  write: (texte: string) => unknown;
}

const FIN_DE_LIGNE = new Set(['\r', '\n']);
const RETOUR_ARRIERE = new Set(['\u007f', '\b']);
const INTERRUPTION = '\u0003'; // Ctrl+C

export function demanderMotDePasse(
  invite: string,
  entree: EntreeTerminal = stdin,
  sortie: SortieTerminal = stdout,
): Promise<string> {
  /**
   * Hors terminal (entrée redirigée, tâche automatisée), il n'y a ni écran ni
   * écho à protéger — et le mode brut n'existe pas. On retombe sur une lecture
   * de ligne ordinaire.
   */
  if (!entree.isTTY) {
    const rl = createInterface({
      input: entree as NodeJS.ReadableStream,
      output: sortie as NodeJS.WritableStream,
    });
    return rl.question(invite).finally(() => {
      rl.close();
    });
  }

  return new Promise<string>((resolve, reject) => {
    sortie.write(invite);
    entree.setRawMode?.(true);
    entree.resume();

    let saisie = '';

    const terminer = (): void => {
      entree.setRawMode?.(false);
      entree.pause();
      entree.removeListener('data', surTouche);
      sortie.write('\n');
    };

    const surTouche = (donnees: Buffer | string): void => {
      const touches = typeof donnees === 'string' ? donnees : donnees.toString('utf8');

      for (const caractere of touches) {
        if (FIN_DE_LIGNE.has(caractere)) {
          terminer();
          resolve(saisie);
          return;
        }

        // Ctrl+C doit interrompre, et non être avalé comme un caractère du secret.
        if (caractere === INTERRUPTION) {
          terminer();
          reject(new Error('Saisie annulée.'));
          return;
        }

        if (RETOUR_ARRIERE.has(caractere)) {
          if (saisie.length > 0) {
            saisie = saisie.slice(0, -1);
            sortie.write('\b \b');
          }
          continue;
        }

        saisie += caractere;
        sortie.write('•');
      }
    };

    entree.on('data', surTouche);
  });
}
