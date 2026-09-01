import { prisma } from '@beralshopp/db';

/**
 * Gestion des rubriques et sous-catégories depuis l'administration.
 *
 * Jusqu'ici la taxonomie était figée dans le script d'amorçage : ouvrir un
 * nouveau rayon exigeait un déploiement. Une boutique qui grandit change de
 * rayons plus souvent qu'elle ne change de code.
 */

export type ResultatCategorie =
  { readonly ok: true } | { readonly ok: false; readonly champ?: string; readonly message: string };

export interface CategorieAdmin {
  readonly id: string;
  readonly nom: string;
  readonly slug: string;
  readonly parentId: string | null;
  readonly iconName: string | null;
  readonly isActive: boolean;
  readonly position: number;
  readonly nbProduits: number;
  readonly nbEnfants: number;
  /** Une catégorie vide peut être supprimée ; les autres se désactivent. */
  readonly supprimable: boolean;
}

export async function listerCategories(): Promise<readonly CategorieAdmin[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
    select: {
      id: true,
      slug: true,
      parentId: true,
      iconName: true,
      isActive: true,
      position: true,
      translations: { where: { locale: 'fr' }, select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    nom: c.translations[0]?.name ?? c.slug,
    slug: c.slug,
    parentId: c.parentId,
    iconName: c.iconName,
    isActive: c.isActive,
    position: c.position,
    nbProduits: c._count.products,
    nbEnfants: c._count.children,
    supprimable: c._count.products === 0 && c._count.children === 0,
  }));
}

function versSlug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function slugLibre(base: string): Promise<string> {
  const racine = base || 'categorie';
  for (let i = 0; i < 50; i += 1) {
    const candidat = i === 0 ? racine : `${racine}-${i + 1}`;
    const pris = await prisma.category.findUnique({
      where: { slug: candidat },
      select: { id: true },
    });
    if (!pris) return candidat;
  }
  return `${racine}-${Date.now()}`;
}

export async function creerCategorie(
  nom: string,
  parentId: string | null,
  iconName: string | null,
): Promise<ResultatCategorie> {
  const nomPropre = nom.trim();
  if (nomPropre.length < 2) {
    return { ok: false, champ: 'nom', message: 'Le nom doit faire au moins 2 caractères.' };
  }

  /**
   * Une sous-catégorie ne peut pas avoir pour parent une autre sous-catégorie.
   * Deux niveaux suffisent à une boutique, et une hiérarchie plus profonde rend
   * la navigation illisible sur téléphone.
   */
  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });
    if (!parent) return { ok: false, champ: 'parentId', message: 'Rubrique parente introuvable.' };
    if (parent.parentId) {
      return {
        ok: false,
        champ: 'parentId',
        message: 'Une sous-catégorie ne peut pas en contenir une autre. Deux niveaux au maximum.',
      };
    }
  }

  const derniere = await prisma.category.findFirst({
    where: { parentId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const categorie = await prisma.category.create({
    data: {
      slug: await slugLibre(versSlug(nomPropre)),
      parentId,
      iconName: iconName?.trim() || null,
      position: (derniere?.position ?? -1) + 1,
      isActive: true,
    },
    select: { id: true },
  });

  await prisma.categoryTranslation.create({
    data: { categoryId: categorie.id, locale: 'fr', name: nomPropre },
  });

  return { ok: true };
}

/** Renomme sans toucher au `slug` : les liens et le référencement restent valables. */
export async function renommerCategorie(
  categoryId: string,
  nom: string,
): Promise<ResultatCategorie> {
  const nomPropre = nom.trim();
  if (nomPropre.length < 2) {
    return { ok: false, champ: 'nom', message: 'Le nom doit faire au moins 2 caractères.' };
  }

  const existe = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!existe) return { ok: false, message: 'Catégorie introuvable.' };

  await prisma.categoryTranslation.upsert({
    where: { categoryId_locale: { categoryId, locale: 'fr' } },
    update: { name: nomPropre },
    create: { categoryId, locale: 'fr', name: nomPropre },
  });

  return { ok: true };
}

/**
 * Active ou désactive une catégorie.
 *
 * Désactiver une rubrique désactive AUSSI ses sous-catégories : les laisser
 * actives sous un parent masqué les rendrait inaccessibles en navigation tout
 * en restant listées ailleurs — une incohérence que personne ne comprendrait.
 */
export async function basculerCategorie(
  categoryId: string,
  actif: boolean,
): Promise<ResultatCategorie> {
  const categorie = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });
  if (!categorie) return { ok: false, message: 'Catégorie introuvable.' };

  await prisma.$transaction([
    prisma.category.update({ where: { id: categoryId }, data: { isActive: actif } }),
    ...(categorie.parentId === null && !actif
      ? [prisma.category.updateMany({ where: { parentId: categoryId }, data: { isActive: false } })]
      : []),
  ]);

  return { ok: true };
}

/**
 * Supprime une catégorie VIDE.
 *
 * Refusée si elle contient des produits ou des sous-catégories. Le schéma
 * détacherait proprement les produits (`SetNull`), mais ils se retrouveraient
 * sans rayon, introuvables autrement que par la recherche — une perte
 * silencieuse de visibilité commerciale.
 */
export async function supprimerCategorie(categoryId: string): Promise<ResultatCategorie> {
  const categorie = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { _count: { select: { products: true, children: true } } },
  });
  if (!categorie) return { ok: false, message: 'Catégorie introuvable.' };

  if (categorie._count.products > 0) {
    return {
      ok: false,
      message:
        `Cette catégorie contient ${categorie._count.products} produit(s). ` +
        'Déplacez-les d’abord, ou désactivez la catégorie.',
    };
  }
  if (categorie._count.children > 0) {
    return {
      ok: false,
      message: 'Cette rubrique contient des sous-catégories. Supprimez-les d’abord.',
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { ok: true };
}
