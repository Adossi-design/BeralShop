import type { CurrencyCode } from '../money/currencies.ts';
import type { Locale } from '../money/format.ts';

/**
 * Référentiel des pays. Données STATIQUES uniquement (nom, devise, indicatif, format
 * d'adresse). L'activation commerciale d'un pays — vente autorisée, livraison
 * disponible, prestataires de paiement — vit dans la table `countries` en base et se
 * pilote depuis le tableau de bord admin. On ne redéploie pas le site pour ouvrir un pays.
 */

export type Region =
  | 'afrique_est'
  | 'afrique_centrale'
  | 'afrique_ouest'
  | 'afrique_australe'
  | 'afrique_nord'
  | 'ocean_indien'
  | 'diaspora';

/**
 * Format d'adresse. Déterminant pour la livraison : le modèle occidental
 * « rue + code postal » ne fonctionne pas dans la plupart des pays visés.
 */
export type AddressFormat =
  /** Rwanda : Province / District / Secteur / Cellule / Village + point de repère. */
  | 'rw'
  /** Afrique francophone : Ville / Quartier / Rue ou point de repère. */
  | 'africa_fr'
  /** Afrique anglophone : City / Area / Street / Landmark. */
  | 'africa_en'
  /** Maghreb : Ville / Quartier / Rue / Code postal. */
  | 'maghreb'
  /** Occidental : Rue / Code postal / Ville. */
  | 'western';

export interface CountryDefinition {
  /** ISO 3166-1 alpha-2. */
  readonly code: string;
  readonly name: string;
  readonly currency: CurrencyCode;
  readonly defaultLocale: Locale;
  /** Indicatif téléphonique international, format E.164. */
  readonly phonePrefix: string;
  readonly addressFormat: AddressFormat;
  readonly region: Region;
  /**
   * Marché prioritaire du plan de développement Beralshopp.
   * Sert uniquement à préremplir la base au premier démarrage.
   */
  readonly priorityMarket?: boolean;
}

function c(
  code: string,
  name: string,
  currency: CurrencyCode,
  defaultLocale: Locale,
  phonePrefix: string,
  addressFormat: AddressFormat,
  region: Region,
  priorityMarket = false,
): CountryDefinition {
  return {
    code,
    name,
    currency,
    defaultLocale,
    phonePrefix,
    addressFormat,
    region,
    ...(priorityMarket ? { priorityMarket } : {}),
  };
}

/**
 * Note sur les langues : Beralshopp démarre en français, anglais et arabe.
 * Les pays lusophones (Angola, Mozambique, Cap-Vert, São Tomé, Guinée-Bissau) sont
 * rattachés provisoirement à l'anglais. L'ajout du portugais est une simple entrée
 * supplémentaire dans SUPPORTED_LOCALES — l'architecture le prévoit déjà.
 */
export const COUNTRIES: readonly CountryDefinition[] = [
  // ——————————————————— Afrique de l'Est ———————————————————
  c('RW', 'Rwanda', 'RWF', 'fr', '+250', 'rw', 'afrique_est', true),
  c('KE', 'Kenya', 'KES', 'en', '+254', 'africa_en', 'afrique_est'),
  c('UG', 'Ouganda', 'UGX', 'en', '+256', 'africa_en', 'afrique_est'),
  c('TZ', 'Tanzanie', 'TZS', 'en', '+255', 'africa_en', 'afrique_est'),
  c('BI', 'Burundi', 'BIF', 'fr', '+257', 'africa_fr', 'afrique_est'),
  c('ET', 'Éthiopie', 'ETB', 'en', '+251', 'africa_en', 'afrique_est'),
  c('SO', 'Somalie', 'SOS', 'ar', '+252', 'africa_en', 'afrique_est'),
  c('DJ', 'Djibouti', 'DJF', 'fr', '+253', 'africa_fr', 'afrique_est'),
  c('ER', 'Érythrée', 'ERN', 'en', '+291', 'africa_en', 'afrique_est'),
  c('SS', 'Soudan du Sud', 'SSP', 'en', '+211', 'africa_en', 'afrique_est'),
  c('SD', 'Soudan', 'SDG', 'ar', '+249', 'africa_en', 'afrique_est'),

  // ——————————————————— Afrique centrale ———————————————————
  c('CM', 'Cameroun', 'XAF', 'fr', '+237', 'africa_fr', 'afrique_centrale', true),
  c('TD', 'Tchad', 'XAF', 'fr', '+235', 'africa_fr', 'afrique_centrale', true),
  c('CD', 'RD Congo', 'CDF', 'fr', '+243', 'africa_fr', 'afrique_centrale', true),
  c('CF', 'Centrafrique', 'XAF', 'fr', '+236', 'africa_fr', 'afrique_centrale'),
  c('CG', 'Congo-Brazzaville', 'XAF', 'fr', '+242', 'africa_fr', 'afrique_centrale'),
  c('GA', 'Gabon', 'XAF', 'fr', '+241', 'africa_fr', 'afrique_centrale'),
  c('GQ', 'Guinée équatoriale', 'XAF', 'fr', '+240', 'africa_fr', 'afrique_centrale'),
  c('AO', 'Angola', 'AOA', 'en', '+244', 'africa_en', 'afrique_centrale'),
  c('ST', 'São Tomé-et-Príncipe', 'STN', 'en', '+239', 'africa_en', 'afrique_centrale'),

  // ——————————————————— Afrique de l'Ouest ———————————————————
  c('CI', "Côte d'Ivoire", 'XOF', 'fr', '+225', 'africa_fr', 'afrique_ouest', true),
  c('SN', 'Sénégal', 'XOF', 'fr', '+221', 'africa_fr', 'afrique_ouest', true),
  c('BJ', 'Bénin', 'XOF', 'fr', '+229', 'africa_fr', 'afrique_ouest', true),
  c('BF', 'Burkina Faso', 'XOF', 'fr', '+226', 'africa_fr', 'afrique_ouest'),
  c('ML', 'Mali', 'XOF', 'fr', '+223', 'africa_fr', 'afrique_ouest'),
  c('NE', 'Niger', 'XOF', 'fr', '+227', 'africa_fr', 'afrique_ouest'),
  c('TG', 'Togo', 'XOF', 'fr', '+228', 'africa_fr', 'afrique_ouest'),
  c('GW', 'Guinée-Bissau', 'XOF', 'en', '+245', 'africa_fr', 'afrique_ouest'),
  c('GN', 'Guinée', 'GNF', 'fr', '+224', 'africa_fr', 'afrique_ouest'),
  c('NG', 'Nigeria', 'NGN', 'en', '+234', 'africa_en', 'afrique_ouest'),
  c('GH', 'Ghana', 'GHS', 'en', '+233', 'africa_en', 'afrique_ouest'),
  c('LR', 'Liberia', 'LRD', 'en', '+231', 'africa_en', 'afrique_ouest'),
  c('SL', 'Sierra Leone', 'SLE', 'en', '+232', 'africa_en', 'afrique_ouest'),
  c('GM', 'Gambie', 'GMD', 'en', '+220', 'africa_en', 'afrique_ouest'),
  c('CV', 'Cap-Vert', 'CVE', 'en', '+238', 'africa_en', 'afrique_ouest'),
  c('MR', 'Mauritanie', 'MRU', 'ar', '+222', 'africa_fr', 'afrique_ouest'),

  // ——————————————————— Afrique australe ———————————————————
  c('ZA', 'Afrique du Sud', 'ZAR', 'en', '+27', 'western', 'afrique_australe'),
  c('ZM', 'Zambie', 'ZMW', 'en', '+260', 'africa_en', 'afrique_australe'),
  c('MW', 'Malawi', 'MWK', 'en', '+265', 'africa_en', 'afrique_australe'),
  c('MZ', 'Mozambique', 'MZN', 'en', '+258', 'africa_en', 'afrique_australe'),
  c('ZW', 'Zimbabwe', 'USD', 'en', '+263', 'africa_en', 'afrique_australe'),
  c('BW', 'Botswana', 'BWP', 'en', '+267', 'africa_en', 'afrique_australe'),
  c('NA', 'Namibie', 'NAD', 'en', '+264', 'africa_en', 'afrique_australe'),
  c('LS', 'Lesotho', 'LSL', 'en', '+266', 'africa_en', 'afrique_australe'),
  c('SZ', 'Eswatini', 'SZL', 'en', '+268', 'africa_en', 'afrique_australe'),

  // ——————————————————— Afrique du Nord ———————————————————
  c('MA', 'Maroc', 'MAD', 'ar', '+212', 'maghreb', 'afrique_nord'),
  c('DZ', 'Algérie', 'DZD', 'ar', '+213', 'maghreb', 'afrique_nord'),
  c('TN', 'Tunisie', 'TND', 'ar', '+216', 'maghreb', 'afrique_nord'),
  c('LY', 'Libye', 'LYD', 'ar', '+218', 'maghreb', 'afrique_nord'),
  c('EG', 'Égypte', 'EGP', 'ar', '+20', 'maghreb', 'afrique_nord'),

  // ——————————————————— Océan Indien ———————————————————
  c('MG', 'Madagascar', 'MGA', 'fr', '+261', 'africa_fr', 'ocean_indien'),
  c('MU', 'Maurice', 'MUR', 'en', '+230', 'africa_en', 'ocean_indien'),
  c('SC', 'Seychelles', 'SCR', 'en', '+248', 'africa_en', 'ocean_indien'),
  c('KM', 'Comores', 'KMF', 'fr', '+269', 'africa_fr', 'ocean_indien'),

  // ——————————————————— Diaspora ———————————————————
  c('FR', 'France', 'EUR', 'fr', '+33', 'western', 'diaspora'),
  c('BE', 'Belgique', 'EUR', 'fr', '+32', 'western', 'diaspora'),
  c('GB', 'Royaume-Uni', 'GBP', 'en', '+44', 'western', 'diaspora'),
  c('US', 'États-Unis', 'USD', 'en', '+1', 'western', 'diaspora'),
  c('CA', 'Canada', 'USD', 'fr', '+1', 'western', 'diaspora'),
  c('AE', 'Émirats arabes unis', 'AED', 'ar', '+971', 'western', 'diaspora'),
];

const COUNTRY_INDEX: ReadonlyMap<string, CountryDefinition> = new Map(
  COUNTRIES.map((country) => [country.code, country]),
);

export function getCountry(code: string): CountryDefinition | undefined {
  return COUNTRY_INDEX.get(code.toUpperCase());
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && COUNTRY_INDEX.has(value.toUpperCase());
}

export function countriesByRegion(region: Region): CountryDefinition[] {
  return COUNTRIES.filter((country) => country.region === region);
}

/** Marchés prioritaires du plan de développement (Rwanda d'abord, puis expansion). */
export function priorityMarkets(): CountryDefinition[] {
  return COUNTRIES.filter((country) => country.priorityMarket === true);
}

/**
 * Devise à proposer par défaut à un visiteur, d'après son pays détecté.
 * Le choix reste TOUJOURS modifiable manuellement et mémorisé dans le profil :
 * la détection automatique seule frustre la diaspora, les voyageurs et les VPN.
 */
export function suggestedCurrency(countryCode: string | undefined): CurrencyCode | undefined {
  return countryCode ? getCountry(countryCode)?.currency : undefined;
}

/** Champs d'adresse attendus selon le format du pays. Pilote le formulaire de livraison. */
export const ADDRESS_FIELDS: Readonly<Record<AddressFormat, readonly string[]>> = {
  rw: ['province', 'district', 'sector', 'cell', 'village', 'landmark'],
  africa_fr: ['city', 'neighbourhood', 'streetLine', 'landmark'],
  africa_en: ['city', 'neighbourhood', 'streetLine', 'landmark'],
  maghreb: ['city', 'neighbourhood', 'streetLine', 'postalCode'],
  western: ['streetLine', 'postalCode', 'city'],
};
