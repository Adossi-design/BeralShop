import '../../db/src/load-env.ts';

import { prisma } from '@beralshopp/db';

import {
  authenticate,
  changePassword,
  registerAccount,
  requestPasswordReset,
  resetPassword,
} from '../src/auth/account-service.ts';
import { checkPasswordStrength } from '../src/auth/password.ts';
import {
  listActiveSessions,
  revokeAllSessions,
  revokeSession,
  validateSession,
} from '../src/auth/session.ts';

/**
 * Contrôle du comportement réel de l'authentification.
 *
 * Vérifie les propriétés de SÉCURITÉ, pas seulement le chemin heureux :
 * non-énumération des comptes, limitation des tentatives, révocation des sessions,
 * usage unique des jetons de réinitialisation.
 *
 *     pnpm --filter @beralshopp/core exec tsx scripts/auth-smoke.ts
 */

let failures = 0;

function report(label: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  else {
    failures += 1;
    console.error(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const SUFFIX = Date.now().toString().slice(-7);
const PHONE = `+25078${SUFFIX}`;
const PASSWORD = 'coucou-kigali-2026';
const NEW_PASSWORD = 'nouveau-mot-de-passe-99';

async function cleanup(): Promise<void> {
  const user = await prisma.user.findUnique({ where: { phone: PHONE }, select: { id: true } });
  if (user) await prisma.user.delete({ where: { id: user.id } });
  await prisma.loginAttempt.deleteMany({ where: { identifier: PHONE } });
}

async function main(): Promise<void> {
  console.log('\n▶ Authentification\n');
  await cleanup();

  // ——— Robustesse des mots de passe ———
  report('Refuse un mot de passe trop court', !checkPasswordStrength('court').isAcceptable);
  report('Refuse un mot de passe courant', !checkPasswordStrength('password').isAcceptable);
  report(
    'Refuse un mot de passe contenant le numéro',
    !checkPasswordStrength(`${PHONE}xyz`, [PHONE]).isAcceptable,
  );

  // ——— Inscription ———
  const registration = await registerAccount({
    fullName: 'Client Test',
    phone: PHONE,
    password: PASSWORD,
  });
  report('Inscription', registration.ok, registration.ok ? '' : registration.message);
  if (!registration.ok) return;

  const userId = registration.userId;
  const firstToken = registration.session.token;

  report('Session créée à l’inscription', (await validateSession(firstToken))?.id === userId);

  const duplicate = await registerAccount({
    fullName: 'Autre',
    phone: PHONE,
    password: PASSWORD,
  });
  report('Refuse un numéro déjà inscrit', !duplicate.ok && duplicate.failure === 'PHONE_TAKEN');

  // ——— Mot de passe stocké ———
  const stored = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  report(
    'Mot de passe haché en Argon2id, jamais en clair',
    stored.passwordHash.startsWith('$argon2id$') && !stored.passwordHash.includes(PASSWORD),
  );

  // ——— Connexion ———
  const good = await authenticate(PHONE, PASSWORD);
  report('Connexion avec le bon mot de passe', good.ok);

  const bad = await authenticate(PHONE, 'mauvais-mot-de-passe');
  const unknown = await authenticate('+250700000001', 'mauvais-mot-de-passe');
  report(
    'Message identique pour compte inexistant et mot de passe faux',
    !bad.ok && !unknown.ok && bad.message === unknown.message,
    bad.ok ? '' : bad.message,
  );

  // ——— Limitation de débit ———
  // Quatre échecs de plus (un déjà enregistré) atteignent le plafond de cinq.
  for (let i = 0; i < 4; i += 1) await authenticate(PHONE, 'encore-faux');
  const limited = await authenticate(PHONE, PASSWORD);
  report(
    'Blocage après 5 échecs, même avec le BON mot de passe',
    !limited.ok && limited.failure === 'RATE_LIMITED',
    limited.ok ? '' : limited.message,
  );

  // On lève le blocage pour la suite du scénario.
  await prisma.loginAttempt.deleteMany({ where: { identifier: PHONE } });

  // ——— Sessions ———
  const second = await authenticate(PHONE, PASSWORD);
  if (!second.ok) {
    report('Reconnexion après levée du blocage', false);
    return;
  }
  const secondToken = second.session.token;

  report('Deux sessions actives', (await listActiveSessions(userId)).length >= 2);

  await revokeSession(firstToken);
  report('Session révoquée devient invalide', (await validateSession(firstToken)) === null);
  report('L’autre session reste valide', (await validateSession(secondToken)) !== null);

  // ——— Réinitialisation ———
  const request = await requestPasswordReset(PHONE);
  report('Demande de réinitialisation', request !== null);

  const noAccount = await requestPasswordReset('+250700000002');
  report('Aucun jeton pour un compte inexistant', noAccount === null);

  if (request) {
    const reset = await resetPassword(request.token, NEW_PASSWORD);
    report('Réinitialisation acceptée', 'ok' in reset && reset.ok === true);

    const replay = await resetPassword(request.token, 'autre-mot-de-passe-1');
    report('Jeton à usage unique — rejeu refusé', !('ok' in replay) || replay.ok !== true);

    report(
      'Toutes les sessions tombent après réinitialisation',
      (await validateSession(secondToken)) === null,
    );

    const withNew = await authenticate(PHONE, NEW_PASSWORD);
    report('Connexion avec le nouveau mot de passe', withNew.ok);

    const withOld = await authenticate(PHONE, PASSWORD);
    report('Ancien mot de passe refusé', !withOld.ok);
  }

  // ——— Changement depuis l'espace client ———
  await prisma.loginAttempt.deleteMany({ where: { identifier: PHONE } });
  const session = await authenticate(PHONE, NEW_PASSWORD);
  if (session.ok) {
    const wrongCurrent = await changePassword(userId, 'pas-le-bon', 'encore-un-autre-42');
    report('Changement refusé sans le mot de passe actuel', !wrongCurrent.ok);

    const changed = await changePassword(
      userId,
      NEW_PASSWORD,
      'troisieme-mot-de-passe-7',
      session.session.token,
    );
    report('Changement accepté', changed.ok);
    report(
      'La session courante survit au changement',
      (await validateSession(session.session.token)) !== null,
    );
  }

  await revokeAllSessions(userId);
  await cleanup();

  if (failures === 0) console.log('\n✔ Authentification conforme\n');
  else {
    console.error(`\n✖ ${failures} contrôle(s) en échec\n`);
    process.exitCode = 1;
  }
}

main()
  .catch(async (error: unknown) => {
    console.error('\n✖ Contrôle interrompu :\n', error);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
