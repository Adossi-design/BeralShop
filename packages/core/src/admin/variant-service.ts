import { prisma } from '@beralshopp/db';

/**
 * Gestion des variantes d'un produit : couleurs, tailles, capacités.
 *
 * Une variante porte son propre stock et son propre écart de prix. C'est elle
 * que le panier référence — jamais le produit.
 */

export type ResultatVariante =
  { readonly ok: true } | { readonly ok: false; readonly champ?: string; readonly message: string };

export interface VarianteAdmin {
  readonly id: string;
  readonly sku: string;
  readonly libelle: string;
  readonly priceDeltaMinor: number;
  readonly stockQuantity: number;
  readonly reservedQuantity: number;
  readonly isActive: boolean;
  /** Une variante déjà commandée ne peut plus être supprimée. */
  readonly supprimable: boolean;
}

/** « Couleur : Noir » plutôt qu'un objet JSON illisible dans un tableau. */
function libelleDe(options: unknown): string {
  if (!options || typeof options !== 'object') return 'Standard';
  const paires = Object.entries(options as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([k, v]) => `${k} : ${String(v)}`);
  return paires.length > 0 ? paires.join(' · ') : 'Standard';
}

export async function listerVariantes(productId: string): Promise<readonly VarianteAdmin[]> {
  const variantes = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      sku: true,
      options: true,
      priceDeltaMinor: true,
      stockQuantity: true,
      reservedQuantity: true,
      isActive: true,
      _count: { select: { orderItems: true } },
    },
  });

  return variantes.map((v) => ({
    id: v.id,
    sku: v.sku,
    libelle: libelleDe(v.options),
    priceDeltaMinor: v.priceDeltaMinor,
    stockQuantity: v.stockQuantity,
    reservedQuantity: v.reservedQuantity,
    isActive: v.isActive,
    supprimable: v._count.orderItems === 0,
  }));
}

/**
 * Ajoute une variante.
 *
 * `attribut` et `valeur` restent libres — « Couleur / Noir », « Taille / XL »,
 * « Capacité / 64 Go ». Imposer une liste fermée obligerait à redéployer pour
 * vendre un produit d'un type nouveau.
 */
export async function ajouterVariante(
  productId: string,
  attribut: string,
  valeur: string,
  priceDeltaMinor: number,
  stock: number,
): Promise<ResultatVariante> {
  const attr = attribut.trim();
  const val = valeur.trim();

  if (!attr || !val) {
    return { ok: false, champ: 'valeur', message: 'Indiquez l’attribut et sa valeur.' };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, champ: 'stock', message: 'Stock invalide.' };
  }
  if (!Number.isInteger(priceDeltaMinor)) {
    return { ok: false, champ: 'delta', message: 'Écart de prix invalide.' };
  }

  const produit = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true },
  });
  if (!produit) return { ok: false, message: 'Produit introuvable.' };

  /**
   * La référence de variante dérive de celle du produit et de la valeur.
   * Accents retirés : une référence lisible se dicte au téléphone, se cherche
   * dans un tableur et s'imprime sur un carton.
   */
  const suffixe = val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);

  const sku = `${produit.sku}-${suffixe || 'VAR'}`;

  const collision = await prisma.productVariant.findUnique({
    where: { sku },
    select: { id: true },
  });
  if (collision) {
    return { ok: false, champ: 'valeur', message: `La variante « ${val} » existe déjà.` };
  }

  await prisma.productVariant.create({
    data: {
      productId,
      sku,
      options: { [attr]: val },
      priceDeltaMinor,
      stockQuantity: stock,
      reservedQuantity: 0,
      isActive: true,
    },
  });

  return { ok: true };
}

/**
 * Active ou désactive une variante.
 *
 * Désactiver la DERNIÈRE variante active est refusé : le produit resterait en
 * vitrine avec un bouton d'achat sans effet. Mieux vaut archiver le produit.
 */
export async function basculerVariante(
  variantId: string,
  actif: boolean,
): Promise<ResultatVariante> {
  const variante = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true },
  });
  if (!variante) return { ok: false, message: 'Variante introuvable.' };

  if (!actif) {
    const actives = await prisma.productVariant.count({
      where: { productId: variante.productId, isActive: true },
    });
    if (actives <= 1) {
      return {
        ok: false,
        message:
          'C’est la dernière variante active. La désactiver rendrait le produit inachetable — ' +
          'archivez plutôt le produit.',
      };
    }
  }

  await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: actif } });
  return { ok: true };
}

/**
 * Supprime une variante.
 *
 * Refusée si elle a déjà été commandée — la commande perdrait le lien vers ce
 * qui a été vendu — et refusée s'il s'agit de la dernière.
 */
export async function supprimerVariante(variantId: string): Promise<ResultatVariante> {
  const variante = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, _count: { select: { orderItems: true, cartItems: true } } },
  });
  if (!variante) return { ok: false, message: 'Variante introuvable.' };

  if (variante._count.orderItems > 0) {
    return {
      ok: false,
      message:
        'Cette variante a déjà été commandée : la supprimer romprait le lien avec ces commandes. ' +
        'Désactivez-la, elle disparaîtra de la boutique.',
    };
  }

  const total = await prisma.productVariant.count({ where: { productId: variante.productId } });
  if (total <= 1) {
    return {
      ok: false,
      message: 'Un produit doit garder au moins une variante, sinon il devient inachetable.',
    };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  return { ok: true };
}
