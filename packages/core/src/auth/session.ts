import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { type UserRole, prisma } from '@beralshopp/db';

/**
 * Sessions de connexion.
 *
 * Le cookie transporte un jeton aléatoire de 32 octets. La base n'en conserve que
 * l'empreinte SHA-256 : une fuite de la table `sessions` ne permet d'usurper aucune
 * connexion, exactement comme pour les mots de passe.
 *
 * SHA-256 sans sel suffit ici, contrairement aux mots de passe : le jeton est déjà
 * aléatoire sur 256 bits, il n'existe donc rien à deviner par force brute.
 */

/** 30 jours. Assez long pour ne pas déconnecter un client entre deux achats. */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Les comptes à privilèges expirent bien plus vite : un poste laissé ouvert dans une
 * boutique ne doit pas rester administrateur pendant un mois.
 */
const PRIVILEGED_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

/** Évite d'écrire en base à chaque page vue pour rafraîchir `lastSeenAt`. */
const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

export const SESSION_COOKIE_NAME = 'beralshopp_session';

export interface SessionUser {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly role: UserRole;
  readonly locale: string;
  readonly preferredCurrency: string;
}

export interface CreatedSession {
  /** À placer dans le cookie. Cette valeur n'existe qu'ici et n'est jamais restockée. */
  readonly token: string;
  readonly expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionDurationFor(role: UserRole): number {
  return role === 'CLIENT' ? SESSION_DURATION_MS : PRIVILEGED_SESSION_DURATION_MS;
}

export async function createSession(
  userId: string,
  role: UserRole,
  context: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<CreatedSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDurationFor(role));

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: context.userAgent?.slice(0, 500) ?? null,
      ipAddress: context.ipAddress ?? null,
    },
  });

  return { token, expiresAt };
}

/**
 * Valide un jeton de session et renvoie l'utilisateur.
 *
 * Renvoie `null` pour toute anomalie — jeton inconnu, expiré, révoqué, ou compte
 * désactivé. Aucun message ne distingue ces cas : ce serait renseigner un attaquant.
 */
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length < 20) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          locale: true,
          preferredCurrency: true,
          isActive: true,
        },
      },
    },
  });

  if (!session || session.revokedAt !== null) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.isActive) return null;

  // Rafraîchissement paresseux : sans ce garde-fou, chaque page vue déclencherait
  // une écriture en base, ce qui multiplierait la charge par le nombre de pages.
  if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const { isActive: _isActive, ...user } = session.user;
  return user;
}

/** Déconnexion. La ligne est conservée, marquée révoquée : c'est une trace d'audit. */
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Révoque toutes les sessions d'un utilisateur.
 * Appelé après un changement ou une réinitialisation de mot de passe : si le compte
 * a été compromis, le voleur doit être éjecté immédiatement.
 */
export async function revokeAllSessions(userId: string, exceptToken?: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptToken ? { tokenHash: { not: hashToken(exceptToken) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export interface ActiveSession {
  readonly id: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
}

/**
 * Sessions actives, pour l'écran « vos connexions ».
 *
 * Le type de retour est déclaré explicitement : sans annotation, TypeScript
 * inférerait un type interne au client Prisma généré, non nommable depuis un autre
 * paquet du monorepo.
 */
export function listActiveSessions(userId: string): Promise<ActiveSession[]> {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });
}

/**
 * Comparaison de chaînes à durée constante.
 * Utilisée pour les jetons de réinitialisation : une comparaison classique s'arrête
 * au premier caractère différent, ce qui laisse fuiter le jeton caractère par
 * caractère en mesurant le temps de réponse.
 */
export function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export { hashToken };
