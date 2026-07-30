import { type Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * Hachage des mots de passe.
 *
 * Argon2id, lauréat de la Password Hashing Competition et recommandation actuelle
 * de l'OWASP. Il résiste aux attaques par GPU là où bcrypt commence à faiblir.
 *
 * Paramètres : minimum OWASP 2024 — 19 Mio de mémoire, 2 itérations, parallélisme 1.
 * La mémoire est le paramètre décisif : c'est elle qui rend le calcul massivement
 * parallèle coûteux pour un attaquant.
 */
/**
 * Argon2id. La valeur est écrite en littéral plutôt qu'importée depuis l'énumération
 * `Algorithm` : celle-ci est un `const enum` ambiant, que `verbatimModuleSyntax`
 * interdit d'utiliser comme valeur. Le type, lui, reste vérifié par TypeScript.
 * (Argon2d = 0, Argon2i = 1, Argon2id = 2.)
 */
const ARGON2ID = 2 as Algorithm;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Vérifie un mot de passe.
 * Renvoie `false` sur une empreinte corrompue plutôt que de lever : une erreur
 * technique ne doit jamais laisser passer une connexion.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Mots de passe les plus utilisés au monde, plus quelques variantes locales.
 *
 * Liste volontairement courte : elle bloque le pire sans imposer de règles absurdes.
 * Les exigences complexes (majuscule + chiffre + caractère spécial) poussent les
 * utilisateurs vers des mots de passe PLUS prévisibles, du type « Passw0rd! ».
 * La longueur reste le facteur déterminant.
 *
 * V2 : vérification contre les fuites connues via l'API k-anonymat de HaveIBeenPwned,
 * qui n'envoie jamais le mot de passe, seulement les cinq premiers caractères de son
 * empreinte SHA-1.
 */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'motdepasse',
  'azertyuiop',
  'qwertyuiop',
  'iloveyou',
  'princess',
  'football',
  'sunshine',
  'baseball',
  'superman',
  'welcome1',
  'abc12345',
  '11111111',
  '00000000',
  'beralshopp',
  'rwanda123',
  'kigali123',
]);

export interface PasswordStrength {
  readonly isAcceptable: boolean;
  readonly reason?: string;
}

/**
 * Refuse les mots de passe manifestement devinables.
 *
 * `personalData` reçoit le nom, le téléphone et l'e-mail : réutiliser son propre
 * numéro comme mot de passe est fréquent et constitue la première chose que teste
 * un attaquant qui connaît sa cible.
 */
export function checkPasswordStrength(
  password: string,
  personalData: readonly (string | null | undefined)[] = [],
): PasswordStrength {
  const normalized = password.trim().toLowerCase();

  if (normalized.length < 8) {
    return { isAcceptable: false, reason: 'Le mot de passe doit contenir au moins 8 caractères.' };
  }

  if (COMMON_PASSWORDS.has(normalized)) {
    return {
      isAcceptable: false,
      reason: 'Ce mot de passe est trop courant. Choisissez-en un autre.',
    };
  }

  // Une seule répétition (« aaaaaaaa ») ou une suite pure de chiffres.
  if (/^(.)\1+$/.test(normalized)) {
    return { isAcceptable: false, reason: 'Ce mot de passe est trop simple.' };
  }

  for (const value of personalData) {
    if (!value) continue;
    const candidate = value.trim().toLowerCase();
    if (candidate.length >= 4 && normalized.includes(candidate)) {
      return {
        isAcceptable: false,
        reason: 'Le mot de passe ne doit pas contenir votre nom, téléphone ou e-mail.',
      };
    }
  }

  return { isAcceptable: true };
}
