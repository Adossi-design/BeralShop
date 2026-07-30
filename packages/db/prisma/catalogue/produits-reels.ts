/**
 * Catalogue réel Beralshopp.
 *
 * Contrairement à `demo-products.ts`, ces produits sont importés dans TOUS les
 * environnements, y compris la production. Ce fichier est la source de vérité tant
 * que l'éditeur de produits complet n'existe pas dans l'administration.
 *
 * ⚠️ TOUS LES PRIX SONT EN FRANCS RWANDAIS ENTIERS. 67842 = 67 842 Frw.
 *
 * L'import est idempotent : relancer ne crée pas de doublon et n'écrase aucune
 * modification faite depuis l'administration (prix, stock, statut). Pour repartir
 * de zéro sur un produit, il faut le supprimer d'abord.
 */

export interface RealVariant {
  readonly suffix: string;
  readonly options: Record<string, string>;
  readonly priceDeltaMinor?: number;
  /** Stock initial. À ajuster ensuite depuis l'administration. */
  readonly stock: number;
}

export interface RealProduct {
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
  readonly isFeatured?: boolean;
  /** `false` crée le produit en BROUILLON : invisible tant qu'il n'a pas de photo. */
  readonly publish?: boolean;
  readonly variants: readonly RealVariant[];
}

export const REAL_PRODUCTS: readonly RealProduct[] = [
  {
    sku: 'SANTE-OTO-Q10',
    slug: 'otoscope-camera-auriculaire-q10-ecran-1-38',
    categorySlug: 'sante-appareils',
    brandSlug: null,
    name: 'Otoscope caméra Q10 — écran 1,38", 1080P, 12 embouts',
    description:
      "Appareil d'inspection visuelle de l'oreille, du nez et de la peau, avec écran " +
      "intégré de 1,38 pouce. Aucune application ni téléphone nécessaire : l'image " +
      "s'affiche directement sur l'appareil.\n\n" +
      'Caméra 1080P de 3,2 mm de diamètre, quatre LED à luminosité réglable et zoom ' +
      "de 1 à 4×. La tête d'inspection pivote à 90°, ce qui permet de regarder " +
      "confortablement sans contorsion, y compris pour examiner l'oreille d'un enfant.\n\n" +
      'Livré avec 12 embouts en silicone souple de deux types : embouts fins pour le ' +
      "conduit auditif et les narines, embouts larges pour l'observation de la peau. " +
      "Les photos sont enregistrées dans l'appareil (environ 100) et la mémoire " +
      "s'étend jusqu'à 128 Go par carte microSD pour l'enregistrement vidéo.\n\n" +
      "Batterie 2000 mAh offrant environ 8 heures d'utilisation pour 3 heures de " +
      'charge, en USB Type-C.\n\n' +
      "⚠️ Appareil d'observation, destiné à un usage domestique. Il ne pose aucun " +
      'diagnostic et ne remplace pas une consultation médicale. Ne jamais forcer ' +
      "l'introduction de l'embout ; en cas de douleur, d'écoulement ou de perte " +
      "d'audition, consultez un professionnel de santé.",
    keywords:
      'otoscope camera oreille auriculaire endoscope inspection nez peau enfant ' +
      'ear camera otoscope 1080p Q10 cure oreille visuel',
    specifications: {
      Écran: '1,38 pouce, affichage intégré',
      Résolution: '1080P, capteur CMOS',
      'Diamètre de la caméra': '3,2 mm',
      'Distance de mise au point': '1,4 à 5 cm',
      Zoom: '1× à 4×',
      Éclairage: '4 LED à luminosité réglable',
      'Tête pivotante': '90°',
      Batterie: '2000 mAh',
      Autonomie: 'Environ 8 heures',
      'Temps de charge': 'Environ 3 heures',
      Charge: 'USB Type-C, 5 V 1 A',
      Mémoire: '≈ 100 photos, extensible à 128 Go (microSD)',
      Matériaux: 'ABS et polycarbonate',
      Poids: 'Environ 85 g',
      Contenu:
        '1 appareil, 5 embouts conduit auditif, 2 embouts peau, 5 cotons-tiges, ' +
        '1 câble de charge, 1 notice',
    },
    basePriceMinor: 67_842,
    // Créé en BROUILLON : un produit sans photo ne doit pas être mis en vente.
    // Passer en « En vente » depuis l'administration une fois les visuels ajoutés.
    publish: false,
    variants: [{ suffix: 'STD', options: {}, stock: 0 }],
  },

  {
    sku: 'ELEC-CAM-Q8',
    slug: 'camera-de-poche-q8-4k-ecran-2-pouces',
    categorySlug: 'electronique-photo',
    brandSlug: null,
    name: 'Caméra de poche Q8 — écran tactile 2", capteur 5 MP, trépied inclus',
    description:
      'Caméra compacte tenant dans la main, avec écran tactile de 2 pouces pour ' +
      'cadrer et revoir ses prises sans passer par un téléphone.\n\n' +
      'Capteur 5 mégapixels avec mise au point automatique, objectif orientable ' +
      'manuellement sur 180° pour filmer face à soi ou devant soi sans retourner ' +
      "l'appareil. Éclairage d'appoint intégré pour les prises en faible lumière.\n\n" +
      'Enregistre la vidéo, le son seul, et déclenche sur détection de mouvement. ' +
      'Mode ralenti disponible.\n\n' +
      'Batterie 2000 mAh, charge en USB Type-C. Les fichiers se transfèrent ' +
      'directement sur un ordinateur par le câble fourni.\n\n' +
      'Livrée complète : carte mémoire 32 Go, trépied, dragonne, câble et notice. ' +
      'Format 137,7 × 36,5 × 30,5 mm pour 162 g — elle tient dans une poche.\n\n' +
      'Menus disponibles en français, anglais, portugais, espagnol et une dizaine ' +
      "d'autres langues.",
    keywords:
      'camera poche action cam vlog 4K enregistreur video portable trepied ' +
      'Q8 camescope voyage sport velo peche randonnee',
    specifications: {
      Écran: '2 pouces, tactile',
      Capteur: '5 mégapixels, mise au point automatique',
      Objectif: 'Rotation manuelle 180°',
      "Éclairage d'appoint": 'Intégré',
      Batterie: '2000 mAh',
      Charge: 'USB Type-C, 5 V 1 A',
      Audio: 'Microphone et haut-parleur intégrés, amplificateur classe D 2 W',
      Fonctions: 'Vidéo, audio seul, photo, détection de mouvement, ralenti',
      Dimensions: '137,7 × 36,5 × 30,5 mm',
      Poids: '162 g',
      Langues: 'Français, anglais, espagnol, portugais et 10 autres',
      Contenu: '1 caméra, 1 carte mémoire 32 Go, 1 trépied, 1 dragonne, 1 câble USB, 1 notice',
    },
    basePriceMinor: 88_001,
    publish: false,
    variants: [
      { suffix: 'NOIR', options: { Couleur: 'Noir' }, stock: 0 },
      { suffix: 'BLANC', options: { Couleur: 'Blanc' }, stock: 0 },
      { suffix: 'ORANGE', options: { Couleur: 'Orange' }, stock: 0 },
    ],
  },
];
