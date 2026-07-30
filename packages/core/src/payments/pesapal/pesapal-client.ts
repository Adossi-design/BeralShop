import { PaymentProviderError } from '../provider.ts';

/**
 * Client HTTP Pesapal API 3.0.
 *
 * Points vérifiés dans la documentation officielle :
 *   • le jeton d'accès est valable 5 MINUTES seulement ;
 *   • `SubmitOrderRequest` renvoie une URL de redirection et un `OrderTrackingId` ;
 *   • il faut appeler `GetTransactionStatus` À LA FOIS au retour du client sur la
 *     page de callback ET à la réception de la notification IPN.
 *
 * Bases :
 *   bac à sable → https://cybqa.pesapal.com/pesapalv3/api
 *   production  → https://pay.pesapal.com/v3/api
 */

const BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3/api',
  production: 'https://pay.pesapal.com/v3/api',
} as const;

export type PesapalEnvironment = keyof typeof BASE_URLS;

/**
 * Le jeton expire en 5 minutes. On le renouvelle à 4 min 30 pour ne jamais présenter
 * un jeton périmé — un décalage d'horloge ou une requête lente suffirait à faire
 * échouer une commande en pleine journée.
 */
const TOKEN_TTL_MS = 4 * 60 * 1000 + 30 * 1000;

interface CachedToken {
  readonly token: string;
  readonly expiresAt: number;
}

/**
 * Cache en mémoire du jeton.
 *
 * Sur un hébergement sans état, chaque instance a le sien : c'est acceptable, un
 * jeton coûte un appel réseau et reste valable 5 minutes. Un cache partagé (Redis)
 * deviendra utile à fort volume, pas avant.
 */
let cachedToken: CachedToken | null = null;

export interface PesapalConfig {
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly environment: PesapalEnvironment;
}

export function readPesapalConfig(): PesapalConfig {
  const consumerKey = process.env['PESAPAL_CONSUMER_KEY'];
  const consumerSecret = process.env['PESAPAL_CONSUMER_SECRET'];
  const environment = (process.env['PESAPAL_ENVIRONMENT'] ?? 'sandbox') as PesapalEnvironment;

  if (!consumerKey || !consumerSecret) {
    throw new PaymentProviderError(
      'PESAPAL_CONSUMER_KEY et PESAPAL_CONSUMER_SECRET doivent être définis.',
      'pesapal',
    );
  }
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new PaymentProviderError(
      `PESAPAL_ENVIRONMENT invalide : ${environment}. Attendu « sandbox » ou « production ».`,
      'pesapal',
    );
  }

  return { consumerKey, consumerSecret, environment };
}

function baseUrl(config: PesapalConfig): string {
  return BASE_URLS[config.environment];
}

async function request<T>(
  config: PesapalConfig,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; token?: string },
): Promise<T> {
  const response = await fetch(`${baseUrl(config)}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    // Un prestataire lent ne doit pas bloquer indéfiniment une requête client.
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new PaymentProviderError(
      `Réponse Pesapal illisible (${response.status}) sur ${path}.`,
      'pesapal',
      text.slice(0, 500),
    );
  }

  if (!response.ok) {
    throw new PaymentProviderError(
      `Pesapal a répondu ${response.status} sur ${path}.`,
      'pesapal',
      payload,
    );
  }

  return payload as T;
}

interface AuthResponse {
  token?: string;
  expiryDate?: string;
  error?: { code?: string; message?: string } | null;
  status?: string;
}

/** Jeton d'accès, mis en cache jusqu'à 30 secondes avant son expiration. */
export async function getAccessToken(config: PesapalConfig, forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await request<AuthResponse>(config, '/Auth/RequestToken', {
    method: 'POST',
    body: {
      consumer_key: config.consumerKey,
      consumer_secret: config.consumerSecret,
    },
  });

  if (!response.token) {
    // Pesapal renvoie parfois un `message` VIDE avec un `code` renseigné. Se
    // contenter du message afficherait une erreur sans contenu, impossible à
    // diagnostiquer. On retombe donc sur le code, qui est toujours parlant
    // (« invalid_consumer_key_or_secret_provided », par exemple).
    const detail =
      response.error?.message?.trim() ||
      response.error?.code ||
      "Pesapal n'a pas renvoyé de jeton d'accès.";

    throw new PaymentProviderError(`Authentification refusée : ${detail}`, 'pesapal', response);
  }

  cachedToken = { token: response.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return response.token;
}

/**
 * Exécute une requête authentifiée, avec UNE nouvelle tentative sur 401.
 * Le jeton ne vit que 5 minutes : une expiration en vol est un cas normal, pas une
 * erreur. Sans cette reprise, des commandes échoueraient au hasard.
 */
async function authenticated<T>(
  config: PesapalConfig,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  try {
    return await request<T>(config, path, { ...init, token: await getAccessToken(config) });
  } catch (error) {
    const isUnauthorized = error instanceof PaymentProviderError && /\b401\b/.test(error.message);
    if (!isUnauthorized) throw error;

    return request<T>(config, path, {
      ...init,
      token: await getAccessToken(config, true),
    });
  }
}

// ─────────────────────────────── Endpoints ───────────────────────────────

export interface RegisterIpnResponse {
  ipn_id?: string;
  url?: string;
  error?: unknown;
  status?: string;
}

/**
 * Enregistre l'URL de notification. À faire UNE FOIS par environnement ;
 * l'`ipn_id` obtenu est ensuite fourni à chaque commande.
 */
export function registerIpn(config: PesapalConfig, url: string): Promise<RegisterIpnResponse> {
  return authenticated<RegisterIpnResponse>(config, '/URLSetup/RegisterIPN', {
    method: 'POST',
    // GET : Pesapal appelle l'URL en GET. POST est possible mais impose de gérer
    // un corps de requête pour une notification qui ne transporte que des paramètres.
    body: { url, ipn_notification_type: 'GET' },
  });
}

export interface SubmitOrderResponse {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  error?: { code?: string; message?: string } | null;
  status?: string;
}

export interface SubmitOrderPayload {
  readonly id: string;
  readonly currency: string;
  readonly amount: number;
  readonly description: string;
  readonly callback_url: string;
  readonly notification_id: string;
  readonly billing_address: {
    readonly phone_number: string;
    readonly email_address?: string;
    readonly first_name: string;
    readonly last_name: string;
    readonly country_code: string;
  };
}

export function submitOrder(
  config: PesapalConfig,
  payload: SubmitOrderPayload,
): Promise<SubmitOrderResponse> {
  return authenticated<SubmitOrderResponse>(config, '/Transactions/SubmitOrderRequest', {
    method: 'POST',
    body: payload,
  });
}

export interface TransactionStatusResponse {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number;
  merchant_reference?: string;
  currency?: string;
  error?: { error_type?: string; code?: string; message?: string } | null;
  status?: string;
}

export function getTransactionStatus(
  config: PesapalConfig,
  orderTrackingId: string,
): Promise<TransactionStatusResponse> {
  return authenticated<TransactionStatusResponse>(
    config,
    `/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { method: 'GET' },
  );
}

export interface RefundResponse {
  status?: string;
  message?: string;
  error?: unknown;
}

export function requestRefund(
  config: PesapalConfig,
  confirmationCode: string,
  amount: number,
  username: string,
  remarks: string,
): Promise<RefundResponse> {
  return authenticated<RefundResponse>(config, '/Transactions/RefundRequest', {
    method: 'POST',
    body: {
      confirmation_code: confirmationCode,
      amount: String(amount),
      username,
      remarks,
    },
  });
}

/** Vide le cache du jeton. Utilisé par les tests et au changement d'environnement. */
export function clearTokenCache(): void {
  cachedToken = null;
}
