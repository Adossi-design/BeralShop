import { prisma } from '@beralshopp/db';

/**
 * Création d'un produit depuis l'administration.
 *
 * TROIS RÈGLES QUI NE SE VOIENT PAS DANS LE FORMULAIRE
 *
 * 1. Une VARIANTE est créée d'office. Le panier référence une variante, jamais
 *    un produit : un produit sans variante s'affiche normalement dans la
 *    boutique, puis le bouton « Ajouter au panier » ne fait rien. Panne
 *    silencieuse, découverte par un client.
 *
 * 2. Le produit naît en BROUILLON. Publier d'emblée mettrait en vitrine un
 *    article sans photo et sans stock vérifié. La publication est un second
 *    geste, volontaire.
 *
 * 3. L'adresse (`slug`) est dérivée du nom et rendue unique. Deux produits
 *    nommés pareil ne doivent pas se disputer la même URL.
 */

export interface CreationProduitInput {
  readonly sku: string;
  readonly nom: string;
  readonly description: string;
  readonly prixMinor: number;
  readonly categoryId: string | null;
  readonly stockInitial: number;
}

export type ResultatCreation =
  | { readonly ok: true; readonly productId: string; readonly slug: string }
  | { readonly ok: false; readonly champ?: string; readonly message: string };

/**
 * Transforme un nom en adresse lisible.
 * Les accents sont décomposés puis retirés : « Caméra » devient « camera », et
 * non « cam-ra » — une URL amputée d'une lettre est laide et se retient mal.
 */
export function versSlug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function slugDisponible(base: string): Promise<string> {
  const racine = base || 'produit';

  for (let suffixe = 0; suffixe < 50; suffixe += 1) {
    const candidat = suffixe === 0 ? racine : `${racine}-${suffixe + 1}`;
    const pris = await prisma.product.findUnique({
      where: { slug: candidat },
      select: { id: true },
    });
    if (!pris) return candidat;
  }

  // Repli : un horodatage garantit l'unicité même dans le pire des cas.
  return `${racine}-${Date.now()}`;
}

/**
 * Transforme un nom de produit en base de référence.
 *
 * Accents retirés, tout en capitales, un tiret pour chaque suite de caractères
 * qui n'est ni lettre ni chiffre. « Écouteurs sans fil Zentro » devient
 * « ECOUTEURS-SANS-FIL ».
 */
function baseDepuisNom(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16)
    .replace(/-+$/g, '');

  return base.length >= 3 ? base : 'PRODUIT';
}

/**
 * Référence unique, dérivée du nom.
 *
 * POURQUOI L'ENGENDRER PLUTÔT QUE LA DEMANDER
 * C'était le premier champ du formulaire de création, et le seul qui exigeait
 * d'inventer quelque chose. Un propriétaire pressé y met « 1 », « AAA » ou le
 * nom du produit en entier ; six mois plus tard, plus personne ne sait quoi
 * cherche quoi. Une référence n'a d'utilité que si elle est unique, stable et
 * lisible — trois propriétés qu'une machine tient mieux qu'une main.
 *
 * Le suffixe aléatoire ne sert pas à cacher quoi que ce soit : il évite la
 * collision entre deux produits au nom voisin. La boucle rejoue jusqu'à trouver
 * un libre, et retombe sur l'horodatage dans le cas — invraisemblable — où douze
 * tirages consécutifs seraient déjà pris.
 *
 * La saisie manuelle reste possible : une boutique qui possède déjà un système
 * de références ne doit pas être forcée d'en adopter un second.
 */
async function genererSku(nom: string): Promise<string> {
  const base = baseDepuisNom(nom);

  for (let essai = 0; essai < 12; essai += 1) {
    const suffixe = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidat = `${base}-${suffixe}`;
    const pris = await prisma.product.findUnique({
      where: { sku: candidat },
      select: { id: true },
    });
    if (!pris) return candidat;
  }

  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export async function creerProduit(input: CreationProduitInput): Promise<ResultatCreation> {
  const nom = input.nom.trim();

  /* Le nom est validé AVANT la référence : celle-ci en dérive désormais, et
     valider ce qui dépend d'une valeur avant la valeur elle-même donnerait des
     messages d'erreur dans le mauvais ordre. */
  if (nom.length < 3) {
    return { ok: false, champ: 'nom', message: 'Le nom doit faire au moins 3 caractères.' };
  }

  const saisie = input.sku.trim().toUpperCase();

  if (saisie.length > 0) {
    if (saisie.length < 3) {
      return { ok: false, champ: 'sku', message: 'La référence doit faire au moins 3 caractères.' };
    }
    if (!/^[A-Z0-9-]+$/.test(saisie)) {
      return {
        ok: false,
        champ: 'sku',
        message: 'La référence n’accepte que des lettres, des chiffres et des tirets.',
      };
    }
  }

  const sku = saisie.length > 0 ? saisie : await genererSku(nom);
  if (!Number.isInteger(input.prixMinor) || input.prixMinor < 0) {
    return { ok: false, champ: 'prix', message: 'Prix invalide.' };
  }
  if (!Number.isInteger(input.stockInitial) || input.stockInitial < 0) {
    return { ok: false, champ: 'stock', message: 'Stock invalide.' };
  }

  const dejaPris = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  if (dejaPris) {
    return { ok: false, champ: 'sku', message: 'Cette référence est déjà utilisée.' };
  }

  const vendeur = await prisma.vendor.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!vendeur) {
    return { ok: false, message: 'Aucun vendeur actif en base. Amorçage incomplet.' };
  }

  const slug = await slugDisponible(versSlug(nom));

  const produit = await prisma.product.create({
    data: {
      sku,
      slug,
      vendorId: vendeur.id,
      categoryId: input.categoryId,
      basePriceMinor: input.prixMinor,
      currency: 'RWF',
      status: 'DRAFT',
      translations: {
        create: [{ locale: 'fr', name: nom, description: input.description.trim() || null }],
      },
      variants: {
        create: [
          {
            // Suffixe « -STD » : la variante par défaut d'un produit sans option.
            sku: `${sku}-STD`,
            options: {},
            stockQuantity: input.stockInitial,
            reservedQuantity: 0,
            isActive: true,
          },
        ],
      },
    },
    select: { id: true, slug: true },
  });

  return { ok: true, productId: produit.id, slug: produit.slug };
}
