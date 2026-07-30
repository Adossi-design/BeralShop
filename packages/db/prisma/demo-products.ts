/**
 * Produits de démonstration.
 *
 * Uniquement pour développer et vérifier l'affichage tant que le vrai catalogue n'est
 * pas fourni. Amorcés seulement si SEED_DEMO_DATA=true, jamais en production.
 *
 * Les marques sont volontairement fictives : afficher de vraies marques dans un jeu de
 * démonstration laisserait croire à des partenariats qui n'existent pas.
 *
 * Tous les prix sont en FRANCS RWANDAIS, exprimés en unités entières (exposant 0).
 * 15000 = 15 000 Frw. Ordre de grandeur calé sur le marché de Kigali.
 */

export interface DemoVariant {
  readonly suffix: string;
  readonly options: Record<string, string>;
  readonly priceDeltaMinor?: number;
  readonly stock: number;
}

export interface DemoProduct {
  readonly sku: string;
  readonly slug: string;
  readonly categorySlug: string;
  readonly brandSlug: string | null;
  readonly name: string;
  readonly description: string;
  readonly keywords: string;
  readonly specifications: Record<string, string>;
  readonly basePriceMinor: number;
  readonly compareAtPriceMinor?: number;
  readonly salesCount: number;
  readonly ratingAvg: number;
  readonly ratingCount: number;
  readonly isFeatured?: boolean;
  /** Ancienneté de publication en jours. 0 à 30 → badge « Nouveau ». */
  readonly publishedDaysAgo: number;
  readonly variants: readonly DemoVariant[];
}

export const DEMO_BRANDS = [
  { slug: 'zentro', name: 'Zentro' },
  { slug: 'kivu-tech', name: 'Kivu Tech' },
  { slug: 'amani', name: 'Amani' },
  { slug: 'beral-home', name: 'Beral Home' },
] as const;

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    sku: 'ZEN-ECB-X300',
    slug: 'ecouteurs-bluetooth-zentro-x300',
    categorySlug: 'electronique-audio',
    brandSlug: 'zentro',
    name: 'Écouteurs Bluetooth sans fil Zentro X300',
    description:
      "Écouteurs sans fil avec boîtier de charge. Jusqu'à 8 heures d'autonomie par charge " +
      'et 32 heures au total avec le boîtier. Réduction de bruit passive, micro intégré ' +
      'pour les appels. Compatibles avec tous les téléphones Android et iPhone.',
    keywords: 'casque audio sans fil oreillette kit mains libres musique',
    specifications: {
      Connectivité: 'Bluetooth 5.3',
      Autonomie: '8 h (32 h avec boîtier)',
      Charge: 'USB-C, 1 h 30',
      Résistance: 'IPX4 (résistant à la transpiration)',
      Poids: '4,5 g par écouteur',
      Garantie: '6 mois',
    },
    basePriceMinor: 15_000,
    compareAtPriceMinor: 22_000,
    salesCount: 142,
    ratingAvg: 4.4,
    ratingCount: 38,
    isFeatured: true,
    publishedDaysAgo: 12,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 24 },
      { suffix: 'BLANC', options: { Couleur: 'Blanc' }, stock: 11 },
      { suffix: 'BLEU', options: { Couleur: 'Bleu nuit' }, stock: 0 },
    ],
  },
  {
    sku: 'KVT-PWB-20K',
    slug: 'batterie-externe-kivu-20000mah',
    categorySlug: 'electronique-accessoires',
    brandSlug: 'kivu-tech',
    name: 'Batterie externe Kivu Tech 20 000 mAh',
    description:
      'Batterie de secours haute capacité avec charge rapide 22,5 W. Recharge un ' +
      'smartphone quatre à cinq fois. Trois ports de sortie pour recharger plusieurs ' +
      'appareils en même temps. Écran indiquant le pourcentage restant.',
    keywords: 'powerbank chargeur portable batterie secours charge rapide',
    specifications: {
      Capacité: '20 000 mAh',
      'Charge rapide': '22,5 W (USB-C PD + QC 3.0)',
      Ports: '2 × USB-A, 1 × USB-C',
      Écran: 'Affichage du pourcentage',
      Poids: '420 g',
      Garantie: '12 mois',
    },
    basePriceMinor: 25_000,
    salesCount: 97,
    ratingAvg: 4.6,
    ratingCount: 24,
    isFeatured: true,
    publishedDaysAgo: 40,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 18 },
      { suffix: 'GRIS', options: { Couleur: 'Gris' }, stock: 7 },
    ],
  },
  {
    sku: 'KVT-MTC-W7',
    slug: 'montre-connectee-kivu-w7',
    categorySlug: 'electronique-accessoires',
    brandSlug: 'kivu-tech',
    name: 'Montre connectée Kivu Tech W7',
    description:
      'Montre connectée avec écran AMOLED 1,43 pouce. Suivi du rythme cardiaque, de ' +
      "l'oxygène sanguin et du sommeil. Plus de 100 modes sportifs. Notifications " +
      'des appels et messages. Autonomie de 7 à 10 jours selon l’usage.',
    keywords: 'smartwatch montre intelligente sport fitness podometre',
    specifications: {
      Écran: 'AMOLED 1,43" — 466 × 466',
      Autonomie: '7 à 10 jours',
      Étanchéité: 'IP68',
      Capteurs: 'Cardio, SpO₂, sommeil',
      Compatibilité: 'Android 6+ / iOS 12+',
      Garantie: '12 mois',
    },
    basePriceMinor: 35_000,
    compareAtPriceMinor: 48_000,
    salesCount: 63,
    ratingAvg: 4.2,
    ratingCount: 19,
    isFeatured: true,
    publishedDaysAgo: 5,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 14 },
      { suffix: 'OR', options: { Couleur: 'Or rose' }, priceDeltaMinor: 2000, stock: 6 },
    ],
  },
  {
    sku: 'ZEN-CHG-33W',
    slug: 'chargeur-rapide-zentro-33w',
    categorySlug: 'electronique-accessoires',
    brandSlug: 'zentro',
    name: 'Chargeur rapide Zentro 33 W avec câble USB-C',
    description:
      'Chargeur mural compact 33 W compatible charge rapide. Recharge un smartphone à ' +
      '50 % en 25 minutes environ. Câble USB-C d’un mètre inclus. Protection contre la ' +
      'surchauffe et les surtensions.',
    keywords: 'chargeur secteur adaptateur usb-c charge rapide cable',
    specifications: {
      Puissance: '33 W',
      Protocoles: 'PD 3.0, QC 4+',
      Câble: 'USB-C vers USB-C, 1 m inclus',
      Protection: 'Surchauffe, surtension, court-circuit',
      Garantie: '12 mois',
    },
    basePriceMinor: 12_000,
    salesCount: 211,
    ratingAvg: 4.5,
    ratingCount: 52,
    publishedDaysAgo: 75,
    variants: [{ suffix: 'STD', options: {}, stock: 42 }],
  },
  {
    sku: 'KVT-SRS-M1',
    slug: 'souris-sans-fil-kivu-m1',
    categorySlug: 'informatique-peripheriques',
    brandSlug: 'kivu-tech',
    name: 'Souris sans fil silencieuse Kivu M1',
    description:
      'Souris sans fil 2,4 GHz avec clics silencieux. Trois niveaux de sensibilité ' +
      "réglables jusqu'à 1600 DPI. Récepteur USB rangeable sous la souris. Fonctionne " +
      'environ six mois avec une pile AA.',
    keywords: 'souris ordinateur portable sans fil bureautique silencieuse',
    specifications: {
      Connexion: 'Sans fil 2,4 GHz',
      Précision: '800 / 1200 / 1600 DPI',
      Alimentation: '1 pile AA (incluse)',
      Autonomie: '≈ 6 mois',
      Garantie: '6 mois',
    },
    basePriceMinor: 7500,
    salesCount: 88,
    ratingAvg: 4.1,
    ratingCount: 27,
    publishedDaysAgo: 60,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 31 },
      { suffix: 'BLANC', options: { Couleur: 'Blanc' }, stock: 15 },
    ],
  },
  {
    sku: 'KVT-USB-64',
    slug: 'cle-usb-kivu-64go',
    categorySlug: 'informatique-peripheriques',
    brandSlug: 'kivu-tech',
    name: 'Clé USB 3.0 Kivu Tech 64 Go',
    description:
      'Clé USB 3.0 de 64 Go, jusqu’à 100 Mo/s en lecture. Boîtier métallique avec ' +
      'anneau porte-clés. Compatible Windows, macOS, Linux, Android via adaptateur.',
    keywords: 'cle usb stockage memoire flash disque',
    specifications: {
      Capacité: '64 Go',
      Interface: 'USB 3.0 (rétrocompatible 2.0)',
      Lecture: 'Jusqu’à 100 Mo/s',
      Boîtier: 'Métal',
      Garantie: '12 mois',
    },
    basePriceMinor: 8000,
    compareAtPriceMinor: 11_000,
    salesCount: 156,
    ratingAvg: 4.3,
    ratingCount: 41,
    publishedDaysAgo: 90,
    variants: [{ suffix: 'STD', options: {}, stock: 58 }],
  },
  {
    sku: 'AMN-SAC-BP1',
    slug: 'sac-a-dos-amani-antivol',
    categorySlug: 'mode-sacs',
    brandSlug: 'amani',
    name: 'Sac à dos antivol Amani avec port USB',
    description:
      'Sac à dos en tissu déperlant avec fermeture dissimulée et poche arrière ' +
      'sécurisée. Compartiment rembourré pour ordinateur portable jusqu’à 15,6 pouces. ' +
      'Port USB externe pour recharger son téléphone en déplacement.',
    keywords: 'sac dos cartable ordinateur voyage ecole antivol',
    specifications: {
      Matière: 'Polyester déperlant',
      Capacité: '25 litres',
      Ordinateur: 'Jusqu’à 15,6"',
      Dimensions: '45 × 30 × 15 cm',
      Garantie: '3 mois',
    },
    basePriceMinor: 18_000,
    salesCount: 74,
    ratingAvg: 4.4,
    ratingCount: 22,
    isFeatured: true,
    publishedDaysAgo: 20,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 12 },
      { suffix: 'GRIS', options: { Couleur: 'Gris' }, stock: 9 },
      { suffix: 'BLEU', options: { Couleur: 'Bleu' }, stock: 4 },
    ],
  },
  {
    sku: 'AMN-TSH-CT',
    slug: 't-shirt-coton-amani',
    categorySlug: 'mode-homme',
    brandSlug: 'amani',
    name: 'T-shirt en coton Amani — coupe droite',
    description:
      'T-shirt 100 % coton peigné 180 g/m². Coupe droite, col rond renforcé. Lavable ' +
      'en machine à 30 °C. Existe en quatre tailles et trois couleurs.',
    keywords: 'tshirt haut vetement coton homme femme',
    specifications: {
      Matière: '100 % coton peigné',
      Grammage: '180 g/m²',
      Coupe: 'Droite, unisexe',
      Entretien: 'Machine 30 °C',
    },
    basePriceMinor: 9000,
    salesCount: 119,
    ratingAvg: 4.0,
    ratingCount: 33,
    publishedDaysAgo: 50,
    variants: [
      { suffix: 'NOIR-M', options: { Couleur: 'Noir', Taille: 'M' }, stock: 20 },
      { suffix: 'NOIR-L', options: { Couleur: 'Noir', Taille: 'L' }, stock: 17 },
      {
        suffix: 'NOIR-XL',
        options: { Couleur: 'Noir', Taille: 'XL' },
        priceDeltaMinor: 1000,
        stock: 8,
      },
      { suffix: 'BLANC-M', options: { Couleur: 'Blanc', Taille: 'M' }, stock: 14 },
      { suffix: 'BLANC-L', options: { Couleur: 'Blanc', Taille: 'L' }, stock: 0 },
    ],
  },
  {
    sku: 'BRH-BOU-17',
    slug: 'bouilloire-electrique-beral-home',
    categorySlug: 'maison-cuisine',
    brandSlug: 'beral-home',
    name: 'Bouilloire électrique Beral Home 1,7 L',
    description:
      'Bouilloire en acier inoxydable de 1,7 litre, 2200 W. Arrêt automatique à ' +
      'ébullition et protection contre la marche à vide. Base pivotante à 360° et ' +
      'indicateur de niveau d’eau.',
    keywords: 'bouilloire chauffe eau the cuisine electromenager',
    specifications: {
      Capacité: '1,7 litre',
      Puissance: '2200 W',
      Matière: 'Acier inoxydable',
      Sécurité: 'Arrêt automatique, protection à vide',
      Garantie: '12 mois',
    },
    basePriceMinor: 22_000,
    compareAtPriceMinor: 28_000,
    salesCount: 66,
    ratingAvg: 4.5,
    ratingCount: 18,
    publishedDaysAgo: 8,
    variants: [{ suffix: 'STD', options: {}, stock: 16 }],
  },
  {
    sku: 'BRH-CAS-5P',
    slug: 'set-casseroles-beral-home-5-pieces',
    categorySlug: 'maison-cuisine',
    brandSlug: 'beral-home',
    name: 'Set de 5 casseroles antiadhésives Beral Home',
    description:
      'Ensemble de cinq casseroles à revêtement antiadhésif, avec couvercles en verre ' +
      'trempé. Compatibles gaz, plaques électriques et induction. Poignées isolantes ' +
      'anti-chaleur.',
    keywords: 'casserole marmite cuisine ustensile poele induction',
    specifications: {
      Contenu: '5 casseroles + 3 couvercles',
      Revêtement: 'Antiadhésif sans PFOA',
      Compatibilité: 'Gaz, électrique, induction',
      Entretien: 'Lavable au lave-vaisselle',
      Garantie: '6 mois',
    },
    basePriceMinor: 45_000,
    salesCount: 29,
    ratingAvg: 4.7,
    ratingCount: 11,
    publishedDaysAgo: 15,
    variants: [{ suffix: 'STD', options: {}, stock: 5 }],
  },
  {
    sku: 'AMN-CRM-HYD',
    slug: 'creme-hydratante-amani-karite',
    categorySlug: 'beaute-soins-corps',
    brandSlug: 'amani',
    name: 'Crème hydratante Amani au beurre de karité — 200 ml',
    description:
      'Crème nourrissante au beurre de karité pour peaux sèches. Sans parfum de ' +
      'synthèse ni paraben. Application quotidienne sur le visage et le corps. ' +
      'Convient aux peaux sensibles.',
    keywords: 'creme soin peau hydratant karite corps visage',
    specifications: {
      Contenance: '200 ml',
      'Ingrédient principal': 'Beurre de karité 25 %',
      'Type de peau': 'Sèche à très sèche',
      Composition: 'Sans paraben, sans parfum de synthèse',
    },
    basePriceMinor: 12_000,
    salesCount: 84,
    ratingAvg: 4.6,
    ratingCount: 29,
    publishedDaysAgo: 25,
    variants: [{ suffix: 'STD', options: {}, stock: 27 }],
  },
  {
    sku: 'AMN-YOG-MAT',
    slug: 'tapis-de-yoga-amani',
    categorySlug: 'sports-fitness',
    brandSlug: 'amani',
    name: 'Tapis de yoga antidérapant Amani — 6 mm',
    description:
      'Tapis de yoga et fitness de 6 mm, surface antidérapante des deux côtés. ' +
      'Amortit les articulations lors des exercices au sol. Sangle de transport ' +
      'incluse. Se nettoie à l’éponge humide.',
    keywords: 'tapis yoga fitness gym sport exercice sol',
    specifications: {
      Dimensions: '183 × 61 cm',
      Épaisseur: '6 mm',
      Matière: 'TPE sans latex',
      Poids: '900 g',
      Inclus: 'Sangle de transport',
    },
    basePriceMinor: 20_000,
    compareAtPriceMinor: 26_000,
    salesCount: 41,
    ratingAvg: 4.3,
    ratingCount: 14,
    publishedDaysAgo: 3,
    variants: [
      { suffix: 'VIOLET', options: { Couleur: 'Violet' }, stock: 10 },
      { suffix: 'VERT', options: { Couleur: 'Vert' }, stock: 8 },
    ],
  },
  {
    sku: 'ZEN-BAL-FT5',
    slug: 'ballon-football-zentro-taille-5',
    categorySlug: 'sports-football',
    brandSlug: 'zentro',
    name: 'Ballon de football Zentro — taille 5',
    description:
      'Ballon de football taille officielle 5, cousu machine. Surface en PU résistante ' +
      'à l’abrasion, adaptée au gazon comme au terrain dur. Livré dégonflé, aiguille ' +
      'de gonflage incluse.',
    keywords: 'ballon football foot sport terrain match',
    specifications: {
      Taille: '5 (officielle)',
      Matière: 'PU cousu machine',
      Usage: 'Gazon et terrain dur',
      Inclus: 'Aiguille de gonflage',
    },
    basePriceMinor: 15_000,
    salesCount: 52,
    ratingAvg: 4.1,
    ratingCount: 16,
    publishedDaysAgo: 35,
    variants: [{ suffix: 'STD', options: {}, stock: 22 }],
  },
  {
    sku: 'BRH-BIB-260',
    slug: 'biberon-anti-colique-beral-home',
    categorySlug: 'bebe-alimentation',
    brandSlug: 'beral-home',
    name: 'Biberon anti-colique Beral Home 260 ml',
    description:
      'Biberon sans BPA de 260 ml avec valve anti-colique qui limite l’ingestion ' +
      'd’air. Tétine en silicone à débit moyen, adaptée dès trois mois. Stérilisable ' +
      'et compatible chauffe-biberon.',
    keywords: 'biberon bebe tetine lait nourrisson puericulture',
    specifications: {
      Contenance: '260 ml',
      Matière: 'Polypropylène sans BPA',
      Tétine: 'Silicone, débit moyen',
      Âge: 'Dès 3 mois',
      Entretien: 'Stérilisable, lave-vaisselle',
    },
    basePriceMinor: 6500,
    salesCount: 38,
    ratingAvg: 4.8,
    ratingCount: 12,
    publishedDaysAgo: 18,
    variants: [
      { suffix: 'BLEU', options: { Couleur: 'Bleu' }, stock: 19 },
      { suffix: 'ROSE', options: { Couleur: 'Rose' }, stock: 13 },
    ],
  },
];
