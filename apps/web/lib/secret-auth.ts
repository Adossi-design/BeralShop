import { timingSafeEqual } from 'node:crypto';

/**
 * Authentification par secret partagé, pour les routes techniques.
 *
 * Utilisée par les tâches planifiées et le diagnostic : des routes qui ne
 * concernent aucun client, et que personne d'autre que l'exploitant ne doit
 * pouvoir appeler.
 *
 * Extraite dans un module commun plutôt que recopiée : une comparaison de secret
 * dupliquée finit toujours par diverger, et c'est la copie oubliée qui devient la
 * faille.
 */
export function isAuthorizedBySecret(request: Request): boolean {
  const expected = process.env['CRON_SECRET'];
  // Pas de secret configuré = route désactivée. Refuser vaut mieux qu'ouvrir.
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Comparaison à durée constante : une comparaison classique laisse deviner le
  // secret caractère par caractère en mesurant le temps de réponse.
  return a.length === b.length && timingSafeEqual(a, b);
}
