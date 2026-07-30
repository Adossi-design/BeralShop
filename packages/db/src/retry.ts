/**
 * Reprise sur réveil de la base.
 *
 * Neon met le calcul en veille après quelques minutes sans trafic. Le premier
 * visiteur qui l'appelle voit alors une erreur — alors que la panne dure une
 * seconde et se résout d'elle-même. On rejoue.
 *
 * ⚠️ CE FICHIER DÉCIDE QUAND REJOUER UNE REQUÊTE. C'EST UNE QUESTION D'ARGENT.
 *
 * Rejouer une requête qui a PEUT-ÊTRE déjà été exécutée peut créer deux
 * commandes, décrémenter deux fois le stock, ou encaisser deux fois. La règle
 * est donc stricte : on ne rejoue que les échecs survenus AVANT que la requête
 * n'atteigne PostgreSQL.
 */

/**
 * Codes signifiant « aucune connexion n'a été établie », donc « rien n'a été
 * exécuté ».
 *
 *   P1001 — serveur injoignable
 *   P2024 — délai dépassé en attendant une connexion du pool
 *   P2039 — erreur brute du pilote ; ici l'« Authentication timed out » de Neon,
 *           refusée pendant l'authentification, donc avant tout SQL
 *
 * P1017 (« le serveur a fermé la connexion ») est délibérément ABSENT : la
 * coupure peut survenir APRÈS l'exécution, pendant l'accusé de réception. Le
 * rejouer, c'est exactement le scénario de la double commande. Une page d'erreur
 * est préférable à une facture en double.
 */
export const CODES_REJOUABLES: ReadonlySet<string> = new Set(['P1001', 'P2024', 'P2039']);

/** Attentes entre tentatives. Deux reprises couvrent un réveil de Neon. */
export const ATTENTES_MS: readonly number[] = [250, 1_000];

export function estRejouable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && CODES_REJOUABLES.has(code);
}

export async function rejouerSiReveil<T>(
  operation: () => Promise<T>,
  attendre: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let essai = 0; ; essai += 1) {
    try {
      return await operation();
    } catch (error) {
      const attente = ATTENTES_MS[essai];
      // Plus de reprise disponible, ou erreur qui ne se rejoue pas : on propage
      // l'erreur d'origine telle quelle, sans l'enrober — le code appelant et les
      // journaux doivent voir la cause réelle.
      if (attente === undefined || !estRejouable(error)) throw error;
      await attendre(attente);
    }
  }
}
