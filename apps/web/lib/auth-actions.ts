'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  SESSION_COOKIE_NAME,
  authenticate,
  changePassword,
  registerAccount,
  requestPasswordReset,
  resetPassword,
  mergeGuestCart,
  revokeAllSessions,
  revokeSession,
} from '@beralshopp/core';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@beralshopp/shared';

import { clearGuestCartCookie, getGuestCartToken } from './cart';
import { getCurrentUser, getRequestContext, getSessionToken } from './session';

/**
 * Actions serveur d'authentification.
 *
 * Toute la logique vit dans `@beralshopp/core` : ces fonctions ne font que valider
 * l'entrée, poser ou retirer le cookie, et rediriger. C'est la règle d'architecture
 * du projet, et c'est ce qui permettra à l'application mobile de réutiliser
 * exactement les mêmes services via l'API.
 */

export interface FormState {
  readonly error?: string;
  /** Erreurs par champ, pour un affichage au bon endroit du formulaire. */
  readonly fieldErrors?: Record<string, string>;
  readonly success?: string;
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    // Inaccessible au JavaScript : immunise le jeton contre le vol par script injecté.
    httpOnly: true,
    // En développement le site tourne en HTTP ; imposer `secure` empêcherait
    // le cookie d'être posé et rendrait la connexion impossible en local.
    secure: process.env.NODE_ENV === 'production',
    // `lax` : le cookie n'accompagne pas les requêtes inter-sites, ce qui bloque
    // les attaques CSRF, tout en survivant à un retour depuis la page Pesapal.
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

function firstIssues(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !result[field]) result[field] = issue.message;
  }
  return result;
}

/** Empêche une redirection vers un site externe injectée via `?suite=`. */
function safeRedirect(target: string | null): string {
  if (!target) return '/compte';
  if (!target.startsWith('/') || target.startsWith('//')) return '/compte';
  return target;
}

/**
 * Rattache le panier du visiteur à son compte, juste après identification.
 *
 * Sans cette étape, un client qui remplit son panier puis se connecte pour payer
 * le verrait se vider. C'est une cause classique d'abandon au moment décisif.
 */
async function attachGuestCart(userId: string): Promise<void> {
  const guestToken = await getGuestCartToken();
  if (!guestToken) return;

  try {
    await mergeGuestCart(guestToken, userId);
  } catch {
    // Un échec de fusion ne doit jamais empêcher la connexion : le client garde
    // son accès, quitte à devoir réajouter un article.
  }
  await clearGuestCartCookie();
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email') || undefined,
    password: formData.get('password'),
    acceptsTerms: formData.get('acceptsTerms') === 'on',
  });

  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues) };
  }

  const context = await getRequestContext();
  const result = await registerAccount(
    {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      password: parsed.data.password,
      ...(parsed.data.email ? { email: parsed.data.email } : {}),
    },
    context,
  );

  if (!result.ok) {
    const field =
      result.failure === 'PHONE_TAKEN'
        ? 'phone'
        : result.failure === 'EMAIL_TAKEN'
          ? 'email'
          : result.failure === 'WEAK_PASSWORD'
            ? 'password'
            : null;
    return field ? { fieldErrors: { [field]: result.message } } : { error: result.message };
  }

  await setSessionCookie(result.session.token, result.session.expiresAt);
  await attachGuestCart(result.userId);
  redirect(safeRedirect(formData.get('suite') as string | null));
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues) };
  }

  const context = await getRequestContext();
  const result = await authenticate(parsed.data.identifier, parsed.data.password, context);

  if (!result.ok) {
    return { error: result.message };
  }

  await setSessionCookie(result.session.token, result.session.expiresAt);
  await attachGuestCart(result.userId);
  redirect(safeRedirect(formData.get('suite') as string | null));
}

export async function logoutAction(): Promise<void> {
  await revokeSession(await getSessionToken());
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect('/');
}

export async function requestResetAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const identifier = String(formData.get('identifier') ?? '').trim();

  if (identifier.length < 3) {
    return { fieldErrors: { identifier: 'Saisissez votre numéro ou votre adresse e-mail.' } };
  }

  const request = await requestPasswordReset(identifier);

  if (request) {
    // TODO lot V2 : envoi effectif par e-mail et SMS.
    // En attendant, le lien est écrit dans les journaux du serveur — jamais renvoyé
    // au navigateur, ce qui permettrait à n'importe qui de réinitialiser un compte.
    console.info(
      `[réinitialisation] utilisateur ${request.userId} — /mot-de-passe/${request.token}`,
    );
  }

  // Message IDENTIQUE que le compte existe ou non : c'est ce qui empêche de tester
  // l'existence d'un client. Ne jamais « améliorer » ce message.
  return {
    success:
      'Si un compte correspond, vous recevrez un lien de réinitialisation dans quelques minutes.',
  };
}

export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
  });

  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues) };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);

  if (!('ok' in result) || !result.ok) {
    return { error: (result as { message: string }).message };
  }

  redirect('/connexion?reinitialise=1');
}

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Vous devez être connecté.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
  });

  if (!parsed.success) {
    return { fieldErrors: firstIssues(parsed.error.issues) };
  }

  const result = await changePassword(
    user.id,
    parsed.data.currentPassword,
    parsed.data.password,
    // La session courante est préservée : déconnecter quelqu'un qui vient de
    // sécuriser son compte serait déroutant.
    await getSessionToken(),
  );

  if (!result.ok) {
    return result.failure === 'INVALID_CREDENTIALS'
      ? { fieldErrors: { currentPassword: result.message } }
      : { fieldErrors: { password: result.message } };
  }

  return {
    success: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.',
  };
}

/** Déconnexion de tous les autres appareils, depuis l'écran Sécurité. */
export async function revokeOtherSessionsAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await revokeAllSessions(user.id, await getSessionToken());
}
