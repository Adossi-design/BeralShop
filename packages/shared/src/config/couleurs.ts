/**
 * Teinte affichable à partir d'un nom de couleur écrit à la main.
 *
 * POURQUOI CE FICHIER EXISTE
 * Photographier un article dans chacune de ses couleurs prend un temps que le
 * propriétaire n'a pas. Sans photo, la boutique n'affichait que le mot
 * « Bordeaux » — le client devait l'imaginer. Une pastille de la bonne teinte,
 * déduite du nom, coûte trois secondes de saisie et se comprend d'un coup d'œil.
 *
 * CE QUE CE FICHIER NE FAIT PAS, ET NE FERA PAS : recolorer la photo du produit.
 * Montrer une image fabriquée d'un article qu'on n'a jamais photographié dans
 * cette teinte, c'est promettre au client quelque chose qu'il ne recevra pas.
 * La pastille, elle, annonce une couleur sans prétendre montrer la marchandise.
 *
 * Le dictionnaire est volontairement COURT et couvre ce qui se vend vraiment.
 * Une teinte absente n'est pas une erreur : le nom s'affiche seul, comme avant,
 * et le propriétaire peut toujours écrire le code exact — « Sable #d8c9a3 ».
 */

/** Noms usuels, en français et en anglais, vers leur teinte d'affichage. */
const TEINTES: Readonly<Record<string, string>> = {
  noir: '#111111',
  black: '#111111',
  blanc: '#ffffff',
  white: '#ffffff',
  gris: '#9ca3af',
  grey: '#9ca3af',
  gray: '#9ca3af',
  argent: '#c4c8cc',
  argente: '#c4c8cc',
  silver: '#c4c8cc',
  rouge: '#dc2626',
  red: '#dc2626',
  bordeaux: '#7f1d1d',
  rose: '#ec4899',
  pink: '#ec4899',
  orange: '#f97316',
  jaune: '#facc15',
  yellow: '#facc15',
  or: '#c9963c',
  dore: '#c9963c',
  gold: '#c9963c',
  vert: '#16a34a',
  green: '#16a34a',
  kaki: '#6b7f3a',
  turquoise: '#14b8a6',
  bleu: '#2563eb',
  blue: '#2563eb',
  marine: '#1e3a5f',
  navy: '#1e3a5f',
  ciel: '#7dd3fc',
  violet: '#7c3aed',
  purple: '#7c3aed',
  mauve: '#b39ddb',
  marron: '#78350f',
  brun: '#78350f',
  brown: '#78350f',
  beige: '#e7d8c0',
  creme: '#f5efe0',
  cream: '#f5efe0',
  ivoire: '#fffff0',
  transparent: '#e5e7eb',
};

/** Minuscules, sans accent : « Doré » et « dore » désignent la même teinte. */
function normaliser(valeur: string): string {
  return valeur.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Teinte d'affichage d'une valeur d'option, ou `null` si elle est inconnue.
 *
 * Trois chances, dans cet ordre :
 *
 *  1. un code écrit à la main dans le libellé — « Sable #d8c9a3 » — qui prime
 *     sur tout le reste : c'est une décision explicite du vendeur ;
 *  2. le nom exact ;
 *  3. le mot connu le PLUS LONG contenu dans le libellé. « Bleu marine » doit
 *     donner le bleu foncé et non le bleu vif : sans la préférence pour le mot
 *     le plus long, « bleu » gagnerait par simple ordre de lecture.
 *
 * Renvoyer `null` plutôt qu'une teinte par défaut est délibéré : un gris posé
 * sur une couleur inconnue ferait croire que l'article est gris.
 */
export function teinteDe(valeur: string): string | null {
  const code = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i.exec(valeur);
  if (code) return `#${code[1]}`;

  const nom = normaliser(valeur);
  if (TEINTES[nom]) return TEINTES[nom];

  let trouve: string | null = null;
  let longueur = 0;
  for (const [mot, teinte] of Object.entries(TEINTES)) {
    if (mot.length > longueur && new RegExp(`\\b${mot}\\b`).test(nom)) {
      trouve = teinte;
      longueur = mot.length;
    }
  }
  return trouve;
}

/**
 * Une teinte très claire a besoin d'un contour pour se voir sur fond blanc.
 * Sans lui, la pastille « Blanc » est un trou dans la page.
 */
export function teinteTresClaire(hex: string): boolean {
  const n = hex.replace('#', '');
  const plein =
    n.length === 3
      ? n
          .split('')
          .map((c) => c + c)
          .join('')
      : n;
  const r = parseInt(plein.slice(0, 2), 16);
  const v = parseInt(plein.slice(2, 4), 16);
  const b = parseInt(plein.slice(4, 6), 16);
  if ([r, v, b].some(Number.isNaN)) return false;
  // Luminance perçue : le vert pèse plus que le rouge, et le bleu très peu.
  return (0.299 * r + 0.587 * v + 0.114 * b) / 255 > 0.9;
}
