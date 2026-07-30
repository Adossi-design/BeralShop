/**
 * Référentiel des devises supportées par Beralshopp.
 *
 * ⚠️ RÈGLE FONDAMENTALE DU PROJET
 * Aucun montant n'est jamais représenté par un nombre à virgule flottante.
 * Tous les montants sont des ENTIERS exprimés dans la plus petite unité de la devise.
 *
 * Exemples :
 *   1500 RWF  → 1 500 Frw   (exposant 0, le franc rwandais n'a pas de subdivision)
 *   1500 USD  → 15,00 $     (exposant 2, 1500 cents)
 *   1500 TND  → 1,500 DT    (exposant 3, le dinar tunisien a trois décimales)
 *
 * Raison : en informatique, 0.1 + 0.2 ne vaut pas exactement 0.3. Sur des milliers
 * de commandes, cela produit des écarts de caisse impossibles à réconcilier.
 * C'est la norme de toute l'industrie du paiement (Pesapal, Stripe, banques).
 *
 * Les exposants suivent la norme ISO 4217. Ne pas les modifier « au jugé » :
 * une erreur d'exposant fait facturer 100 fois trop ou 100 fois trop peu.
 */

/** Devise de référence : tous les prix du catalogue sont saisis et stockés en RWF. */
export const BASE_CURRENCY = 'RWF' as const;

export const CURRENCY_CODES = [
  // ——— Afrique de l'Est ———
  'RWF', // Rwanda — devise de référence
  'KES', // Kenya
  'UGX', // Ouganda
  'TZS', // Tanzanie
  'BIF', // Burundi
  'ETB', // Éthiopie
  'SOS', // Somalie
  'DJF', // Djibouti
  'ERN', // Érythrée
  'SSP', // Soudan du Sud
  'SDG', // Soudan

  // ——— Afrique centrale ———
  'XAF', // CEMAC : Cameroun, Tchad, Centrafrique, Congo, Gabon, Guinée équatoriale
  'CDF', // RD Congo
  'AOA', // Angola
  'STN', // São Tomé-et-Príncipe

  // ——— Afrique de l'Ouest ———
  'XOF', // UEMOA : Côte d'Ivoire, Sénégal, Bénin, Burkina, Mali, Niger, Togo, Guinée-Bissau
  'NGN', // Nigeria
  'GHS', // Ghana
  'GNF', // Guinée
  'LRD', // Liberia
  'SLE', // Sierra Leone
  'GMD', // Gambie
  'CVE', // Cap-Vert
  'MRU', // Mauritanie

  // ——— Afrique australe ———
  'ZAR', // Afrique du Sud
  'ZMW', // Zambie
  'MWK', // Malawi
  'MZN', // Mozambique
  'BWP', // Botswana
  'NAD', // Namibie
  'LSL', // Lesotho
  'SZL', // Eswatini

  // ——— Afrique du Nord ———
  'MAD', // Maroc
  'DZD', // Algérie
  'TND', // Tunisie
  'LYD', // Libye
  'EGP', // Égypte

  // ——— Océan Indien ———
  'MGA', // Madagascar
  'MUR', // Maurice
  'SCR', // Seychelles
  'KMF', // Comores

  // ——— International (diaspora, cartes bancaires) ———
  'USD',
  'EUR',
  'GBP',
  'AED', // Émirats — corridor d'approvisionnement fréquent
  'CNY', // Chine — corridor fournisseurs (Sunsky)
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * Règle d'arrondi appliquée à l'AFFICHAGE d'un prix converti.
 * Elle ne s'applique jamais à un montant déjà encaissé.
 */
export type RoundingRule =
  /** Aucun arrondi — montant exact. */
  | 'none'
  /** Arrondi au multiple de 100 supérieur (RWF : 12 347 → 12 400 Frw). */
  | 'up_100'
  /** Arrondi au multiple de 25 supérieur (FCFA : 6 213 → 6 225 FCFA). */
  | 'up_25'
  /** Arrondi commercial « x,99 » (USD/EUR : 19,43 → 19,99 $). */
  | 'up_99';

/** Exposant ISO 4217 : nombre de décimales de la devise. */
export type MinorUnitExponent = 0 | 2 | 3;

export interface CurrencyDefinition {
  readonly code: CurrencyCode;
  readonly name: string;
  /** Puissance de 10 séparant l'unité principale de la plus petite unité. */
  readonly minorUnitExponent: MinorUnitExponent;
  readonly symbol: string;
  readonly symbolPosition: 'prefix' | 'suffix';
  /** Arrondi appliqué lors d'une conversion pour affichage. */
  readonly displayRounding: RoundingRule;
}

function define(
  code: CurrencyCode,
  name: string,
  minorUnitExponent: MinorUnitExponent,
  symbol: string,
  symbolPosition: 'prefix' | 'suffix',
  displayRounding: RoundingRule,
): CurrencyDefinition {
  return { code, name, minorUnitExponent, symbol, symbolPosition, displayRounding };
}

export const CURRENCIES: Readonly<Record<CurrencyCode, CurrencyDefinition>> = {
  // ——— Afrique de l'Est ———
  RWF: define('RWF', 'Franc rwandais', 0, 'Frw', 'suffix', 'up_100'),
  KES: define('KES', 'Shilling kényan', 2, 'KSh', 'prefix', 'up_99'),
  UGX: define('UGX', 'Shilling ougandais', 0, 'USh', 'prefix', 'up_100'),
  TZS: define('TZS', 'Shilling tanzanien', 2, 'TSh', 'prefix', 'up_100'),
  BIF: define('BIF', 'Franc burundais', 0, 'FBu', 'suffix', 'up_100'),
  ETB: define('ETB', 'Birr éthiopien', 2, 'Br', 'prefix', 'up_99'),
  SOS: define('SOS', 'Shilling somalien', 2, 'Sh', 'prefix', 'up_100'),
  DJF: define('DJF', 'Franc djiboutien', 0, 'Fdj', 'suffix', 'up_25'),
  ERN: define('ERN', 'Nakfa érythréen', 2, 'Nfk', 'prefix', 'up_99'),
  SSP: define('SSP', 'Livre sud-soudanaise', 2, 'SSP', 'suffix', 'up_100'),
  SDG: define('SDG', 'Livre soudanaise', 2, 'SDG', 'suffix', 'up_100'),

  // ——— Afrique centrale ———
  XAF: define('XAF', 'Franc CFA (CEMAC)', 0, 'FCFA', 'suffix', 'up_25'),
  CDF: define('CDF', 'Franc congolais', 2, 'FC', 'suffix', 'up_100'),
  AOA: define('AOA', 'Kwanza angolais', 2, 'Kz', 'suffix', 'up_99'),
  STN: define('STN', 'Dobra santoméen', 2, 'Db', 'suffix', 'up_99'),

  // ——— Afrique de l'Ouest ———
  XOF: define('XOF', 'Franc CFA (UEMOA)', 0, 'FCFA', 'suffix', 'up_25'),
  NGN: define('NGN', 'Naira nigérian', 2, '₦', 'prefix', 'up_99'),
  GHS: define('GHS', 'Cedi ghanéen', 2, 'GH₵', 'prefix', 'up_99'),
  GNF: define('GNF', 'Franc guinéen', 0, 'FG', 'suffix', 'up_100'),
  LRD: define('LRD', 'Dollar libérien', 2, 'L$', 'prefix', 'up_99'),
  SLE: define('SLE', 'Leone sierra-léonais', 2, 'Le', 'prefix', 'up_99'),
  GMD: define('GMD', 'Dalasi gambien', 2, 'D', 'prefix', 'up_99'),
  CVE: define('CVE', 'Escudo cap-verdien', 2, '$', 'suffix', 'up_99'),
  MRU: define('MRU', 'Ouguiya mauritanien', 2, 'UM', 'suffix', 'up_99'),

  // ——— Afrique australe ———
  ZAR: define('ZAR', 'Rand sud-africain', 2, 'R', 'prefix', 'up_99'),
  ZMW: define('ZMW', 'Kwacha zambien', 2, 'ZK', 'prefix', 'up_99'),
  MWK: define('MWK', 'Kwacha malawite', 2, 'MK', 'prefix', 'up_99'),
  MZN: define('MZN', 'Metical mozambicain', 2, 'MT', 'suffix', 'up_99'),
  BWP: define('BWP', 'Pula botswanais', 2, 'P', 'prefix', 'up_99'),
  NAD: define('NAD', 'Dollar namibien', 2, 'N$', 'prefix', 'up_99'),
  LSL: define('LSL', 'Loti lesothan', 2, 'L', 'prefix', 'up_99'),
  SZL: define('SZL', 'Lilangeni swazi', 2, 'E', 'prefix', 'up_99'),

  // ——— Afrique du Nord ———
  MAD: define('MAD', 'Dirham marocain', 2, 'DH', 'suffix', 'up_99'),
  DZD: define('DZD', 'Dinar algérien', 2, 'DA', 'suffix', 'up_99'),
  TND: define('TND', 'Dinar tunisien', 3, 'DT', 'suffix', 'up_99'),
  LYD: define('LYD', 'Dinar libyen', 3, 'LD', 'suffix', 'up_99'),
  EGP: define('EGP', 'Livre égyptienne', 2, 'E£', 'prefix', 'up_99'),

  // ——— Océan Indien ———
  MGA: define('MGA', 'Ariary malgache', 2, 'Ar', 'suffix', 'up_100'),
  MUR: define('MUR', 'Roupie mauricienne', 2, 'Rs', 'prefix', 'up_99'),
  SCR: define('SCR', 'Roupie seychelloise', 2, 'SR', 'prefix', 'up_99'),
  KMF: define('KMF', 'Franc comorien', 0, 'CF', 'suffix', 'up_25'),

  // ——— International ———
  USD: define('USD', 'Dollar américain', 2, '$', 'prefix', 'up_99'),
  EUR: define('EUR', 'Euro', 2, '€', 'suffix', 'up_99'),
  GBP: define('GBP', 'Livre sterling', 2, '£', 'prefix', 'up_99'),
  AED: define('AED', 'Dirham des Émirats', 2, 'AED', 'suffix', 'up_99'),
  CNY: define('CNY', 'Yuan chinois', 2, '¥', 'prefix', 'up_99'),
} as const;

/**
 * Devises que Pesapal est capable d'encaisser.
 * Source vérifiée : documentation marchand Pesapal — KES, USD, EUR, GBP, UGX, TZS, ZMW, RWF.
 * Utilisé par le routeur de paiement pour choisir le prestataire adapté au client.
 */
export const PESAPAL_SETTLEMENT_CURRENCIES: readonly CurrencyCode[] = [
  'RWF',
  'KES',
  'UGX',
  'TZS',
  'ZMW',
  'USD',
  'EUR',
  'GBP',
];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in CURRENCIES;
}

export function getCurrency(code: CurrencyCode): CurrencyDefinition {
  const currency = CURRENCIES[code];
  if (!currency) {
    throw new Error(`Devise non supportée : ${code}`);
  }
  return currency;
}
