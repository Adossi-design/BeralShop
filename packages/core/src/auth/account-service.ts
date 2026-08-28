import { randomBytes } from 'node:crypto';

import { prisma } from '@beralshopp/db';
import { TERMS_VERSION } from '@beralshopp/shared';

import { checkPasswordStrength, hashPassword, verifyPassword } from './password.ts';
import { type CreatedSession, createSession, hashToken, revokeAllSessions } from './session.ts';

/**
 * Inscription, connexion et réinitialisation de mot de passe.
 *
 * Deux principes gouvernent tout ce fichier :
 *
 * 1. NE JAMAIS RÉVÉLER SI UN COMPTE EXISTE. Ni par le message, ni par le temps de
 *    réponse. Une plateforme qui répond « ce numéro n'existe pas » offre à un
 *    attaquant la liste de ses clients.
 *
 * 2. LIMITER LES TENTATIVES en base et non en mémoire. Sur un hébergement sans état,
 *    chaque requête peut atterrir sur une instance différente ; un compteur en
 *    mémoire ne protégerait de rien.
 */

/** Fenêtre d'observation des échecs de connexion. */
const RATE_WINDOW_MS = 15 * 60 * 1000;
/** Échecs tolérés pour un même identifiant avant blocage temporaire. */
const MAX_ATTEMPTS_PER_IDENTIFIER = 5;
/** Plafond par adresse IP : contre le balayage de nombreux comptes depuis un point. */
const MAX_ATTEMPTS_PER_IP = 25;
/** Durée de validité d'un lien de réinitialisation. */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export type AuthFailure =
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMITED'
  | 'ACCOUNT_DISABLED'
  | 'PHONE_TAKEN'
  | 'EMAIL_TAKEN'
  | 'WEAK_PASSWORD'
  | 'INVALID_TOKEN';

export interface AuthError {
  readonly ok: false;
  readonly failure: AuthFailure;
  readonly message: string;
  /** Renseigné pour RATE_LIMITED : secondes à attendre. */
  readonly retryAfterSeconds?: number;
}

export interface AuthSuccess {
  readonly ok: true;
  readonly userId: string;
  readonly session: CreatedSession;
}

export type AuthResult = AuthSuccess | AuthError;

export interface RequestContext {
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
}

/**
 * Empreinte factice, utilisée quand aucun compte ne correspond.
 *
 * Sans elle, une tentative sur un numéro inexistant répondrait instantanément
 * tandis qu'un numéro existant prendrait ~100 ms le temps du calcul Argon2. Cet
 * écart suffit à énumérer les clients. On vérifie donc toujours un mot de passe,
 * même contre rien.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(24).toString('hex'));
  return dummyHash;
}

function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed.replace(/[\s().-]/g, '');
}

async function checkRateLimit(
  identifier: string,
  ipAddress: string | null | undefined,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);

  const [byIdentifier, byIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier, succeeded: false, createdAt: { gte: since } },
    }),
    ipAddress
      ? prisma.loginAttempt.count({
          where: { ipAddress, succeeded: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  if (byIdentifier >= MAX_ATTEMPTS_PER_IDENTIFIER || byIp >= MAX_ATTEMPTS_PER_IP) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: {
        succeeded: false,
        createdAt: { gte: since },
        ...(byIdentifier >= MAX_ATTEMPTS_PER_IDENTIFIER ? { identifier } : { ipAddress }),
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    // Le blocage se lève quand la plus ancienne tentative sort de la fenêtre.
    const retryAfterMs = oldest
      ? Math.max(0, oldest.createdAt.getTime() + RATE_WINDOW_MS - Date.now())
      : RATE_WINDOW_MS;

    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  return { allowed: true };
}

function recordAttempt(
  identifier: string,
  ipAddress: string | null | undefined,
  succeeded: boolean,
): Promise<unknown> {
  return prisma.loginAttempt.create({
    data: { identifier, ipAddress: ipAddress ?? null, succeeded },
  });
}

// ─────────────────────────────── Inscription ───────────────────────────────

export interface RegisterInput {
  readonly fullName: string;
  readonly phone: string;
  readonly email?: string | undefined;
  readonly password: string;
  readonly locale?: string | undefined;
  readonly countryCode?: string | undefined;
}

export async function registerAccount(
  input: RegisterInput,
  context: RequestContext = {},
): Promise<AuthResult> {
  const strength = checkPasswordStrength(input.password, [
    input.fullName,
    input.phone,
    input.email,
  ]);
  if (!strength.isAcceptable) {
    return {
      ok: false,
      failure: 'WEAK_PASSWORD',
      message: strength.reason ?? 'Mot de passe trop faible.',
    };
  }

  const existingPhone = await prisma.user.findUnique({
    where: { phone: input.phone },
    select: { id: true },
  });
  if (existingPhone) {
    // Ici on informe volontairement : sans cela, un client déjà inscrit qui a oublié
    // son compte réessaierait indéfiniment. Le compromis est assumé et limité au
    // formulaire d'inscription, jamais à la connexion.
    return {
      ok: false,
      failure: 'PHONE_TAKEN',
      message: 'Un compte existe déjà avec ce numéro. Connectez-vous.',
    };
  }

  if (input.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingEmail) {
      return {
        ok: false,
        failure: 'EMAIL_TAKEN',
        message: 'Un compte existe déjà avec cette adresse e-mail.',
      };
    }
  }

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash: await hashPassword(input.password),
      locale: input.locale ?? 'fr',
      countryCode: input.countryCode ?? 'RW',
      lastLoginAt: new Date(),

      /**
       * Trace du consentement.
       *
       * Le formulaire EXIGE déjà l'acceptation — la validation la refuse sinon.
       * Mais l'exiger sans la conserver ne prouve rien : en cas de litige, c'est
       * cette date qui atteste que le client a accepté, et la version qui dit
       * lesquelles de nos conditions l'engageaient à ce moment-là. Sans le
       * numéro de version, une mise à jour des conditions rendrait la preuve
       * inutilisable.
       */
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
    select: { id: true, role: true },
  });

  const session = await createSession(user.id, user.role, context);
  return { ok: true, userId: user.id, session };
}

// ─────────────────────────────── Connexion ───────────────────────────────

export async function authenticate(
  rawIdentifier: string,
  password: string,
  context: RequestContext = {},
): Promise<AuthResult> {
  const identifier = normalizeIdentifier(rawIdentifier);

  const rate = await checkRateLimit(identifier, context.ipAddress);
  if (!rate.allowed) {
    const minutes = Math.ceil(rate.retryAfterSeconds / 60);
    return {
      ok: false,
      failure: 'RATE_LIMITED',
      message: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  const user = await prisma.user.findFirst({
    where: identifier.includes('@') ? { email: identifier } : { phone: identifier },
    select: { id: true, passwordHash: true, role: true, isActive: true },
  });

  // Toujours vérifier un mot de passe, même sans compte : voir getDummyHash.
  const isValid = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword(await getDummyHash(), password);

  if (!user || !isValid) {
    await recordAttempt(identifier, context.ipAddress, false);
    return {
      ok: false,
      failure: 'INVALID_CREDENTIALS',
      // Message identique que le compte existe ou non.
      message: 'Numéro, e-mail ou mot de passe incorrect.',
    };
  }

  if (!user.isActive) {
    await recordAttempt(identifier, context.ipAddress, false);
    return {
      ok: false,
      failure: 'ACCOUNT_DISABLED',
      message: 'Ce compte est désactivé. Contactez le service client.',
    };
  }

  await Promise.all([
    recordAttempt(identifier, context.ipAddress, true),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);

  const session = await createSession(user.id, user.role, context);
  return { ok: true, userId: user.id, session };
}

// ──────────────────────── Réinitialisation du mot de passe ────────────────────────

export interface ResetRequest {
  /** Jeton en clair, à insérer dans le lien envoyé au client. */
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: Date;
}

/**
 * Demande de réinitialisation.
 *
 * Renvoie `null` si aucun compte ne correspond — et l'appelant DOIT afficher le même
 * message dans les deux cas. C'est ce qui empêche de tester l'existence d'un compte.
 */
export async function requestPasswordReset(rawIdentifier: string): Promise<ResetRequest | null> {
  const identifier = normalizeIdentifier(rawIdentifier);

  const user = await prisma.user.findFirst({
    where: identifier.includes('@') ? { email: identifier } : { phone: identifier },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  // Les demandes précédentes sont neutralisées : un seul lien valide à la fois.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  });

  return { token, userId: user.id, expiresAt };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true; userId: string } | AuthError> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, fullName: true, phone: true, email: true } } },
  });

  if (!record || record.usedAt !== null || record.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      failure: 'INVALID_TOKEN',
      message: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.',
    };
  }

  const strength = checkPasswordStrength(newPassword, [
    record.user.fullName,
    record.user.phone,
    record.user.email,
  ]);
  if (!strength.isAcceptable) {
    return {
      ok: false,
      failure: 'WEAK_PASSWORD',
      message: strength.reason ?? 'Mot de passe trop faible.',
    };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Toutes les sessions tombent : si le compte a été compromis, la personne qui
  // détenait l'accès est éjectée à l'instant même du changement.
  await revokeAllSessions(record.user.id);

  return { ok: true, userId: record.user.id };
}

/** Changement de mot de passe depuis l'espace client, ancien mot de passe requis. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionToken?: string,
): Promise<{ ok: true } | AuthError> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, fullName: true, phone: true, email: true },
  });

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    return {
      ok: false,
      failure: 'INVALID_CREDENTIALS',
      message: 'Mot de passe actuel incorrect.',
    };
  }

  const strength = checkPasswordStrength(newPassword, [user.fullName, user.phone, user.email]);
  if (!strength.isAcceptable) {
    return {
      ok: false,
      failure: 'WEAK_PASSWORD',
      message: strength.reason ?? 'Mot de passe trop faible.',
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // On conserve la session courante : déconnecter quelqu'un qui vient de sécuriser
  // son compte serait déroutant. Les autres appareils, eux, sont éjectés.
  await revokeAllSessions(userId, keepSessionToken);

  return { ok: true };
}
