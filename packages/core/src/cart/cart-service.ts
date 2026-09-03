import { prisma } from '@beralshopp/db';
import {
  BASE_CURRENCY,
  type CurrencyCode,
  type Money,
  add,
  clampToZero,
  money,
  multiply,
  subtract,
  sum,
  zero,
} from '@beralshopp/shared';

import { prixUnitaireMinor } from '../pricing/price-tiers.ts';
import { buildPriceView } from '../pricing/product-price.ts';
import {
  type CartLineIssue,
  type CartLineView,
  type CartMutationResult,
  type CartOwner,
  type CartView,
  GUEST_CART_TTL_DAYS,
  MAX_QUANTITY_PER_LINE,
  USER_CART_TTL_DAYS,
} from './types.ts';

/**
 * Service panier.
 *
 * PRINCIPE CENTRAL : le panier ne stocke QUE des identifiants de variante et des
 * quantités. Aucun prix, aucun libellé, aucune image. Tout est relu depuis le
 * catalogue à chaque affichage.
 *
 * Conséquences voulues :
 *   • un client ne peut pas modifier un prix dans son navigateur ;
 *   • une baisse de prix profite immédiatement aux paniers en cours ;
 *   • une rupture de stock est signalée avant la commande, jamais après paiement.
 */

const CART_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: {
            include: {
              translations: { where: { locale: 'fr' } },
              images: { orderBy: { position: 'asc' }, take: 1 },
              /* Les paliers sont chargés AVEC le panier : le prix d'une ligne
                 dépend de sa quantité, et une requête par ligne coûterait un
                 aller-retour par article à chaque affichage du panier. */
              priceTiers: { select: { minQuantity: true, unitPriceMinor: true } },
            },
          },
        },
      },
    },
  },
} as const;

function expiryFor(owner: CartOwner): Date {
  const days = owner.kind === 'user' ? USER_CART_TTL_DAYS : GUEST_CART_TTL_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function findOrCreateCartId(owner: CartOwner): Promise<string> {
  if (owner.kind === 'user') {
    const existing = await prisma.cart.findFirst({
      where: { userId: owner.userId, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.cart.create({
      data: { userId: owner.userId, currency: BASE_CURRENCY, expiresAt: expiryFor(owner) },
      select: { id: true },
    });
    return created.id;
  }

  const existing = await prisma.cart.findUnique({
    where: { sessionToken: owner.sessionToken },
    select: { id: true, expiresAt: true },
  });
  if (existing && existing.expiresAt.getTime() > Date.now()) return existing.id;

  if (existing) {
    // Panier expiré : on le réactive plutôt que d'en créer un second, la contrainte
    // d'unicité sur `sessionToken` interdisant les doublons.
    await prisma.cart.update({
      where: { id: existing.id },
      data: { expiresAt: expiryFor(owner) },
    });
    return existing.id;
  }

  const created = await prisma.cart.create({
    data: {
      sessionToken: owner.sessionToken,
      currency: BASE_CURRENCY,
      expiresAt: expiryFor(owner),
    },
    select: { id: true },
  });
  return created.id;
}

function variantLabel(options: unknown): string {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) return '';
  return Object.values(options as Record<string, unknown>)
    .filter((value): value is string => typeof value === 'string')
    .join(' · ');
}

/**
 * Frais de livraison estimés.
 *
 * On retient le tarif le MOINS CHER du pays : annoncer d'emblée le tarif le plus
 * élevé ferait abandonner des paniers, et le montant exact ne peut de toute façon
 * être connu qu'une fois l'adresse saisie.
 */
async function estimateShipping(
  subtotal: Money,
  countryCode = 'RW',
): Promise<{
  shipping: Money | null;
  threshold: Money | null;
  isFree: boolean;
}> {
  const rate = await prisma.shippingRate.findFirst({
    where: { isActive: true, zone: { countryCode, isActive: true } },
    orderBy: { priceMinor: 'asc' },
    select: { priceMinor: true, currency: true, freeAboveMinor: true },
  });

  if (!rate) return { shipping: null, threshold: null, isFree: false };

  const currency = rate.currency as CurrencyCode;
  const threshold = rate.freeAboveMinor !== null ? money(rate.freeAboveMinor, currency) : null;
  // Gratuite si le tarif lui-même est à zéro (politique actuelle : livraison
  // offerte partout), ou si le panier dépasse le seuil « offerte dès ».
  const isFree =
    rate.priceMinor === 0 || (threshold !== null && subtotal.amountMinor >= threshold.amountMinor);

  return {
    shipping: isFree ? zero(currency) : money(rate.priceMinor, currency),
    threshold,
    isFree,
  };
}

interface CartRow {
  id: string;
  currency: string;
  items: {
    id: string;
    quantity: number;
    variantId: string;
    variant: {
      id: string;
      sku: string;
      options: unknown;
      priceDeltaMinor: number;
      stockQuantity: number;
      reservedQuantity: number;
      isActive: boolean;
      product: {
        slug: string;
        sku: string;
        status: string;
        publishedAt: Date | null;
        basePriceMinor: number;
        compareAtPriceMinor: number | null;
        translations: { name: string }[];
        images: { url: string }[];
        priceTiers: { minQuantity: number; unitPriceMinor: number }[];
      };
    };
  }[];
}

function buildLine(item: CartRow['items'][number]): CartLineView {
  const { variant } = item;
  const { product } = variant;

  const available = Math.max(0, variant.stockQuantity - variant.reservedQuantity);
  const isSellable =
    variant.isActive && product.status === 'ACTIVE' && product.publishedAt !== null;

  /**
   * PRIX DÉGRESSIF : le tarif dépend de la quantité de CETTE ligne.
   *
   * On ne remplace pas `buildPriceView` — il porte aussi le prix barré et le
   * pourcentage de remise — on lui donne un prix de base déjà remisé par le
   * palier atteint. Le calcul du palier vient de `prixUnitaireMinor`, la MÊME
   * fonction qu'utilise la validation de commande : deux implémentations de la
   * règle finiraient par diverger, et le total affiché ne serait plus le montant
   * encaissé.
   *
   * L'écart de variante est retiré du résultat puis repassé à `buildPriceView`,
   * qui l'applique lui-même — sinon il compterait deux fois.
   */
  const unitaireAvecPalier = prixUnitaireMinor(
    product.basePriceMinor,
    variant.priceDeltaMinor,
    item.quantity,
    product.priceTiers,
  );

  const unitPrice = buildPriceView({
    basePriceMinor: unitaireAvecPalier - variant.priceDeltaMinor,
    compareAtPriceMinor: product.compareAtPriceMinor,
    variantDeltaMinor: variant.priceDeltaMinor,
  });

  let issue: CartLineIssue | null = null;
  if (!isSellable) issue = 'UNAVAILABLE';
  else if (available === 0) issue = 'OUT_OF_STOCK';
  else if (available < item.quantity) issue = 'REDUCED_STOCK';

  return {
    id: item.id,
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.translations[0]?.name ?? product.sku,
    variantLabel: variantLabel(variant.options),
    sku: variant.sku,
    imageUrl: product.images[0]?.url ?? null,
    unitPrice,
    quantity: item.quantity,
    // Une ligne indisponible compte pour zéro : elle ne doit pas gonfler le total
    // que le client s'apprête à payer.
    lineTotal:
      issue === 'UNAVAILABLE' || issue === 'OUT_OF_STOCK'
        ? zero(unitPrice.amount.currency)
        : multiply(unitPrice.amount, Math.min(item.quantity, available)),
    availableQuantity: available,
    issue,
  };
}

async function buildView(cartId: string): Promise<CartView> {
  const cart = (await prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: CART_INCLUDE,
  })) as unknown as CartRow;

  const currency = (cart.currency || BASE_CURRENCY) as CurrencyCode;
  const lines = cart.items.map(buildLine);

  const subtotal = sum(
    lines.map((line) => line.lineTotal),
    currency,
  );
  const { shipping, threshold, isFree } = await estimateShipping(subtotal);

  const remainingForFreeShipping =
    threshold && !isFree ? clampToZero(subtract(threshold, subtotal)) : null;

  return {
    id: cart.id,
    currency,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    subtotal,
    shippingEstimate: shipping,
    freeShippingThreshold: threshold,
    remainingForFreeShipping,
    isShippingFree: isFree,
    total: shipping ? add(subtotal, shipping) : subtotal,
    hasIssues: lines.some((line) => line.issue !== null),
  };
}

// ─────────────────────────────── API publique ───────────────────────────────

export async function getCart(owner: CartOwner): Promise<CartView> {
  return buildView(await findOrCreateCartId(owner));
}

/** Nombre d'articles, pour la pastille de l'en-tête. Requête minimale. */
export async function getCartItemCount(owner: CartOwner): Promise<number> {
  const cart = await prisma.cart.findFirst({
    where:
      owner.kind === 'user'
        ? { userId: owner.userId, expiresAt: { gt: new Date() } }
        : { sessionToken: owner.sessionToken, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: 'desc' },
    select: { items: { select: { quantity: true } } },
  });

  return cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
}

export async function addToCart(
  owner: CartOwner,
  variantId: string,
  quantity: number,
): Promise<CartMutationResult> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
    return { ok: false, reason: 'INVALID_QUANTITY', message: 'Quantité invalide.' };
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      isActive: true,
      stockQuantity: true,
      reservedQuantity: true,
      product: { select: { status: true, publishedAt: true } },
    },
  });

  if (
    !variant ||
    !variant.isActive ||
    variant.product.status !== 'ACTIVE' ||
    variant.product.publishedAt === null
  ) {
    return {
      ok: false,
      reason: 'VARIANT_NOT_FOUND',
      message: "Ce produit n'est plus disponible.",
    };
  }

  const available = Math.max(0, variant.stockQuantity - variant.reservedQuantity);
  if (available === 0) {
    return { ok: false, reason: 'INSUFFICIENT_STOCK', message: 'Ce produit est en rupture.' };
  }

  const cartId = await findOrCreateCartId(owner);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
    select: { id: true, quantity: true },
  });

  // Ajouter deux fois le même article incrémente la ligne existante plutôt que
  // d'en créer une seconde — c'est ce qu'attend le client.
  const desired = (existing?.quantity ?? 0) + quantity;
  const finalQuantity = Math.min(desired, available, MAX_QUANTITY_PER_LINE);

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: finalQuantity },
    });
  } else {
    await prisma.cartItem.create({ data: { cartId, variantId, quantity: finalQuantity } });
  }

  await prisma.cart.update({ where: { id: cartId }, data: { expiresAt: expiryFor(owner) } });

  return { ok: true, cart: await buildView(cartId) };
}

/** Met à jour une quantité. `0` supprime la ligne. */
export async function updateCartItem(
  owner: CartOwner,
  cartItemId: string,
  quantity: number,
): Promise<CartMutationResult> {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY_PER_LINE) {
    return { ok: false, reason: 'INVALID_QUANTITY', message: 'Quantité invalide.' };
  }

  const cartId = await findOrCreateCartId(owner);

  // La ligne doit appartenir AU PANIER DE CET APPELANT : sans cette vérification,
  // n'importe qui pourrait modifier le panier d'autrui en devinant un identifiant.
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId },
    select: {
      id: true,
      variant: { select: { stockQuantity: true, reservedQuantity: true } },
    },
  });

  if (!item) {
    return { ok: false, reason: 'LINE_NOT_FOUND', message: 'Article introuvable dans le panier.' };
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return { ok: true, cart: await buildView(cartId) };
  }

  const available = Math.max(0, item.variant.stockQuantity - item.variant.reservedQuantity);
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: Math.min(quantity, Math.max(1, available)) },
  });

  return { ok: true, cart: await buildView(cartId) };
}

export async function removeCartItem(
  owner: CartOwner,
  cartItemId: string,
): Promise<CartMutationResult> {
  return updateCartItem(owner, cartItemId, 0);
}

export async function clearCart(owner: CartOwner): Promise<CartView> {
  const cartId = await findOrCreateCartId(owner);
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return buildView(cartId);
}

/**
 * Fusionne le panier d'un visiteur dans celui de son compte, à la connexion.
 *
 * Sans cette étape, un client qui remplit son panier puis se connecte pour payer
 * le verrait se vider — abandon garanti.
 *
 * En cas de conflit sur une même variante, on retient la quantité la plus élevée
 * plutôt que de les additionner : additionner surprend le client, qui se retrouve
 * avec six exemplaires après avoir choisi trois fois de suite « 3 ».
 */
export async function mergeGuestCart(sessionToken: string, userId: string): Promise<void> {
  const guestCart = await prisma.cart.findUnique({
    where: { sessionToken },
    select: { id: true, items: { select: { variantId: true, quantity: true } } },
  });

  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await prisma.cart.delete({ where: { id: guestCart.id } });
    return;
  }

  const userCartId = await findOrCreateCartId({ kind: 'user', userId });

  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: userCartId, variantId: item.variantId } },
      select: { id: true, quantity: true },
    });

    if (existing) {
      if (item.quantity > existing.quantity) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: item.quantity },
        });
      }
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCartId, variantId: item.variantId, quantity: item.quantity },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
}
