/**
 * Arborescence des catégories Beralshopp — taxonomie réelle fournie par le client.
 *
 * Ce n'est PAS une donnée de démonstration : elle est amorcée dans tous les
 * environnements. L'admin pourra ensuite renommer, réordonner, masquer ou compléter
 * depuis le tableau de bord (lot 7) — le seed n'écrase jamais ces réglages, il se
 * contente de créer ce qui manque.
 *
 * ⚠️ Les `slug` sont uniques dans TOUTE la table, pas seulement au sein d'un parent.
 * Les sous-catégories dont le nom se répète (« Accessoires » apparaît sous Électronique,
 * Animaux et Automobile ; « Jouets » sous Bébé et Animaux) sont donc préfixées par leur
 * rubrique. C'est aussi meilleur pour le référencement : l'URL /categories/animaux-jouets
 * est explicite là où /categories/jouets serait ambigu.
 */

export interface CategorySeed {
  readonly slug: string;
  readonly name: string;
  readonly icon: string;
  readonly children?: readonly { slug: string; name: string }[];
}

export const CATEGORY_TREE: readonly CategorySeed[] = [
  {
    slug: 'electronique',
    name: 'Électronique',
    icon: 'smartphone',
    children: [
      { slug: 'electronique-smartphones', name: 'Smartphones' },
      { slug: 'electronique-ordinateurs', name: 'Ordinateurs' },
      { slug: 'electronique-tablettes', name: 'Tablettes' },
      { slug: 'electronique-accessoires', name: 'Accessoires' },
      { slug: 'electronique-televiseurs', name: 'Téléviseurs' },
      { slug: 'electronique-audio', name: 'Audio' },
    ],
  },
  {
    slug: 'mode',
    name: 'Mode',
    icon: 'shirt',
    children: [
      { slug: 'mode-homme', name: 'Homme' },
      { slug: 'mode-femme', name: 'Femme' },
      { slug: 'mode-enfant', name: 'Enfant' },
      { slug: 'mode-chaussures', name: 'Chaussures' },
      { slug: 'mode-sacs', name: 'Sacs' },
      { slug: 'mode-bijoux', name: 'Bijoux' },
      { slug: 'mode-montres', name: 'Montres' },
    ],
  },
  {
    slug: 'maison-jardin',
    name: 'Maison et Jardin',
    icon: 'house',
    children: [
      { slug: 'maison-meubles', name: 'Meubles' },
      { slug: 'maison-decoration', name: 'Décoration' },
      { slug: 'maison-cuisine', name: 'Cuisine' },
      { slug: 'maison-eclairage', name: 'Éclairage' },
      { slug: 'maison-jardinage', name: 'Jardinage' },
      { slug: 'maison-bricolage', name: 'Bricolage' },
    ],
  },
  {
    slug: 'beaute-sante',
    name: 'Beauté et Santé',
    icon: 'sparkles',
    children: [
      { slug: 'beaute-maquillage', name: 'Maquillage' },
      { slug: 'beaute-soins-visage', name: 'Soins du visage' },
      { slug: 'beaute-soins-corps', name: 'Soins du corps' },
      { slug: 'beaute-parfums', name: 'Parfums' },
      { slug: 'beaute-complements', name: 'Compléments alimentaires' },
    ],
  },
  {
    slug: 'supermarche',
    name: 'Supermarché',
    icon: 'shopping-basket',
    children: [
      { slug: 'supermarche-boissons', name: 'Boissons' },
      { slug: 'supermarche-frais', name: 'Produits frais' },
      { slug: 'supermarche-surgeles', name: 'Produits surgelés' },
      { slug: 'supermarche-epicerie', name: 'Épicerie' },
      { slug: 'supermarche-snacks', name: 'Snacks' },
    ],
  },
  {
    slug: 'informatique',
    name: 'Informatique',
    icon: 'laptop',
    children: [
      { slug: 'informatique-pc-portables', name: 'PC portables' },
      { slug: 'informatique-pc-bureau', name: 'PC de bureau' },
      { slug: 'informatique-composants', name: 'Composants' },
      { slug: 'informatique-peripheriques', name: 'Périphériques' },
      { slug: 'informatique-logiciels', name: 'Logiciels' },
    ],
  },
  {
    slug: 'sports-loisirs',
    name: 'Sports et Loisirs',
    icon: 'dumbbell',
    children: [
      { slug: 'sports-fitness', name: 'Fitness' },
      { slug: 'sports-football', name: 'Football' },
      { slug: 'sports-cyclisme', name: 'Cyclisme' },
      { slug: 'sports-camping', name: 'Camping' },
      { slug: 'sports-natation', name: 'Natation' },
    ],
  },
  {
    slug: 'livres-medias',
    name: 'Livres et Médias',
    icon: 'book-open',
    children: [
      { slug: 'medias-livres', name: 'Livres' },
      { slug: 'medias-ebooks', name: 'E-books' },
      { slug: 'medias-musique', name: 'Musique' },
      { slug: 'medias-films', name: 'Films' },
      { slug: 'medias-jeux-video', name: 'Jeux vidéo' },
    ],
  },
  {
    slug: 'bebe',
    name: 'Bébé',
    icon: 'baby',
    children: [
      { slug: 'bebe-vetements', name: 'Vêtements' },
      { slug: 'bebe-jouets', name: 'Jouets' },
      { slug: 'bebe-poussettes', name: 'Poussettes' },
      { slug: 'bebe-alimentation', name: 'Alimentation' },
      { slug: 'bebe-hygiene', name: 'Hygiène' },
    ],
  },
  {
    slug: 'animaux',
    name: 'Animaux',
    icon: 'paw-print',
    children: [
      { slug: 'animaux-nourriture', name: 'Nourriture' },
      { slug: 'animaux-jouets', name: 'Jouets' },
      { slug: 'animaux-accessoires', name: 'Accessoires' },
      { slug: 'animaux-soins', name: 'Produits de soins' },
    ],
  },
  {
    slug: 'automobile',
    name: 'Automobile',
    icon: 'car',
    children: [
      { slug: 'auto-pieces', name: 'Pièces détachées' },
      { slug: 'auto-pneus', name: 'Pneus' },
      { slug: 'auto-accessoires', name: 'Accessoires' },
      { slug: 'auto-entretien', name: 'Entretien' },
    ],
  },
  {
    slug: 'bureau-fournitures',
    name: 'Bureau et Fournitures scolaires',
    icon: 'pencil',
    children: [
      { slug: 'bureau-papeterie', name: 'Papeterie' },
      { slug: 'bureau-mobilier', name: 'Mobilier de bureau' },
      { slug: 'bureau-imprimantes', name: 'Imprimantes' },
      { slug: 'bureau-scolaire', name: 'Fournitures scolaires' },
    ],
  },
  {
    slug: 'bijoux-montres',
    name: 'Bijoux et Montres',
    icon: 'gem',
  },
  {
    slug: 'jeux-jouets',
    name: 'Jeux et Jouets',
    icon: 'gamepad-2',
  },
  {
    slug: 'art-artisanat',
    name: 'Art et Artisanat',
    icon: 'palette',
  },
];

/** Nombre total de catégories, rubriques et sous-catégories confondues. */
export const CATEGORY_COUNT = CATEGORY_TREE.reduce(
  (total, category) => total + 1 + (category.children?.length ?? 0),
  0,
);
