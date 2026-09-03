'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  type AdminActor,
  adminChangeOrderStatus,
  adminSetCustomerActive,
  adminSetInternalNote,
  adminSetTracking,
  adminUpdateProductPricing,
  adminUpdateStock,
  ajouterImage,
  ajouterVariante,
  basculerCategorie,
  creerCategorie,
  renommerCategorie,
  supprimerCategorie,
  archiverProduit,
  basculerVariante,
  creerProduit,
  modifierTextes,
  supprimerProduit,
  supprimerVariante,
  definirImagePrincipale,
  definirPalier,
  supprimerPalier,
  supprimerImage,
} from '@beralshopp/core';
import type { OrderStatus } from '@beralshopp/db';

import { getCurrentUser, getRequestContext } from './session';
import { stockageConfigure, supprimerFichier, televerserImage } from './stockage';

/**
 * Actions d'administration.
 *
 * Chaque action REVÉRIFIE le rôle. Le layout protège l'affichage, mais une action
 * serveur est un point d'entrée à part entière : elle peut être appelée directement,
 * sans jamais charger la page. Se fier au seul layout laisserait une porte ouverte.
 */

export interface AdminActionState {
  readonly error?: string;
  readonly success?: string;
}

async function requireActor(): Promise<AdminActor | null> {
  const user = await getCurrentUser();
  if (!user || user.role === 'CLIENT') return null;

  const context = await getRequestContext();
  return { id: user.id, ipAddress: context.ipAddress, userAgent: context.userAgent };
}

export async function changeOrderStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const orderNumber = String(formData.get('orderNumber') ?? '');
  const toStatus = String(formData.get('status') ?? '') as OrderStatus;
  const note = String(formData.get('note') ?? '').trim();

  if (!orderNumber || !toStatus) return { error: 'Paramètres manquants.' };

  const result = await adminChangeOrderStatus(actor, orderNumber, toStatus, note || undefined);
  if (!result.ok) return { error: result.message ?? 'Changement refusé.' };

  revalidatePath(`/admin/commandes/${orderNumber}`);
  revalidatePath('/admin/commandes');
  revalidatePath('/admin');
  return { success: 'Statut mis à jour.' };
}

export async function setTrackingAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const orderNumber = String(formData.get('orderNumber') ?? '');
  const trackingNumber = String(formData.get('trackingNumber') ?? '');
  const carrierName = String(formData.get('carrierName') ?? '');

  const result = await adminSetTracking(actor, orderNumber, trackingNumber, carrierName);
  if (!result.ok) return { error: result.message ?? 'Enregistrement refusé.' };

  revalidatePath(`/admin/commandes/${orderNumber}`);
  return { success: 'Numéro de suivi enregistré.' };
}

export async function setInternalNoteAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const orderNumber = String(formData.get('orderNumber') ?? '');
  await adminSetInternalNote(actor, orderNumber, String(formData.get('internalNote') ?? ''));
  revalidatePath(`/admin/commandes/${orderNumber}`);
}

export async function updateProductAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const productId = String(formData.get('productId') ?? '');
  const price = Number(formData.get('basePriceMinor'));
  const compareRaw = String(formData.get('compareAtPriceMinor') ?? '').trim();
  const compareAt = compareRaw === '' ? null : Number(compareRaw);
  const status = String(formData.get('status') ?? 'ACTIVE') as 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  if (!Number.isFinite(price)) return { error: 'Prix invalide.' };
  if (compareAt !== null && !Number.isFinite(compareAt)) return { error: 'Ancien prix invalide.' };

  const result = await adminUpdateProductPricing(actor, productId, price, compareAt, status);
  if (!result.ok) return { error: result.message ?? 'Modification refusée.' };

  revalidatePath('/admin/produits');
  // Les pages publiques sont régénérées : sans cela, un prix modifié resterait
  // affiché à l'ancien tarif jusqu'à l'expiration du cache.
  revalidatePath('/', 'layout');
  return { success: 'Produit mis à jour.' };
}

export async function updateStockAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action non autorisée.' };

  const variantId = String(formData.get('variantId') ?? '');
  const stock = Number(formData.get('stockQuantity'));

  if (!Number.isFinite(stock)) return { error: 'Stock invalide.' };

  const result = await adminUpdateStock(actor, variantId, stock);
  if (!result.ok) return { error: result.message ?? 'Modification refusée.' };

  revalidatePath('/admin/produits');
  revalidatePath('/', 'layout');
  return { success: 'Stock mis à jour.' };
}

export async function toggleCustomerAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const userId = String(formData.get('userId') ?? '');
  const isActive = formData.get('isActive') === '1';

  await adminSetCustomerActive(actor, userId, isActive);
  revalidatePath('/admin/clients');
}

/* ═══════════════════════════ Images des produits ═══════════════════════════ */

/**
 * Téléverse une ou plusieurs images et les rattache au produit.
 *
 * ⚠️ Le rôle est REVÉRIFIÉ ici, comme dans toute action d'administration : cette
 * fonction est un point d'entrée à part entière, appelable sans jamais charger la
 * page qui l'expose. Sans ce contrôle, n'importe qui pourrait déposer des
 * fichiers sur la boutique.
 */
export async function televerserImagesAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { error: 'Produit introuvable.' };

  const fichiers = formData.getAll('fichiers').filter((f): f is File => f instanceof File);
  const reels = fichiers.filter((f) => f.size > 0);
  if (reels.length === 0) return { error: 'Choisissez au moins une image.' };

  const altText = String(formData.get('altText') ?? '');

  const rangVitrine = Number(formData.get('fichiersVitrine') ?? -1);

  let ajoutees = 0;
  let idVitrine: string | null = null;
  const echecs: string[] = [];

  for (const [rang, fichier] of reels.entries()) {
    const depot = await televerserImage(fichier, `produits/${productId}`);
    if (!depot.ok) {
      echecs.push(`${fichier.name} — ${depot.message}`);
      continue;
    }
    const image = await ajouterImage(productId, depot.url, altText);
    if (rang === rangVitrine) idVitrine = image.id;
    ajoutees += 1;
  }

  /* Ici le rang par défaut est -1, et non 0 : sur une fiche qui possède déjà
     des photos, envoyer une pièce jointe supplémentaire ne doit PAS changer la
     devanture sans qu'on l'ait demandé. */
  if (idVitrine) await definirImagePrincipale(productId, idVitrine);

  revalidatePath(`/admin/produits/${productId}`);
  // La boutique affiche ces images : sans cette invalidation, le propriétaire
  // les verrait dans l'administration mais pas sur le site avant 5 minutes.
  revalidatePath('/', 'layout');

  if (echecs.length > 0) {
    return {
      ...(ajoutees > 0 ? { success: `${ajoutees} image(s) ajoutée(s).` } : {}),
      error: echecs.join(' · '),
    };
  }

  return { success: `${ajoutees} image(s) ajoutée(s).` };
}

export async function supprimerImageAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const imageId = String(formData.get('imageId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  if (!imageId) return;

  const { urlAEffacer } = await supprimerImage(imageId);

  /**
   * La référence en base part D'ABORD, le fichier ensuite. Si l'ordre était
   * inverse et que la seconde opération échouait, la boutique afficherait une
   * image morte — un carré cassé sur une fiche produit.
   */
  if (urlAEffacer) await supprimerFichier(urlAEffacer);

  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
}

export async function imagePrincipaleAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const imageId = String(formData.get('imageId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  if (!imageId || !productId) return;

  await definirImagePrincipale(productId, imageId);
  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
}

/* ═══════════════════════════ Création d'un produit ═══════════════════════════ */

export interface EtatCreationProduit {
  readonly erreurs?: Record<string, string>;
  /**
   * Valeurs saisies, renvoyees telles quelles en cas de refus.
   *
   * ⚠️ SANS CELA, un refus de validation vide le formulaire : React le re-rend,
   * et les champs non controles reprennent leur valeur par defaut. Le prix et le
   * stock retombaient a 0. Le proprietaire corrigeait la reference, renvoyait, et
   * creait un produit a 0 Frw sans rien remarquer.
   */
  readonly valeurs?: Record<string, string>;
}

/**
 * Crée un produit puis redirige vers sa fiche d'administration.
 *
 * La redirection est délibérée : après création, la suite naturelle est
 * d'ajouter les photos et de vérifier le stock. Laisser le propriétaire sur un
 * formulaire vide l'obligerait à retrouver son produit dans la liste.
 */
export async function creerProduitAction(
  _precedent: EtatCreationProduit,
  formData: FormData,
): Promise<EtatCreationProduit> {
  const actor = await requireActor();
  if (!actor) return { erreurs: { general: 'Action réservée à l’administration.' } };

  const prixSaisi = Number(String(formData.get('prix') ?? '').replace(/\s/g, ''));
  const stockSaisi = Number(String(formData.get('stock') ?? '0').replace(/\s/g, ''));
  const categoryId = String(formData.get('categoryId') ?? '') || null;

  /* « Noir, Blanc, Orange » → une variante par teinte. Le point-virgule est
     accepté autant que la virgule : c'est le séparateur que produisent les
     claviers de téléphone en français. */
  /**
   * UNE ENTRÉE DE FORMULAIRE PAR COULEUR.
   *
   * Le formulaire pose un champ caché pour chacune : il n'y a plus rien à
   * redécouper ici, et une couleur dont le nom contiendrait une virgule ne se
   * casse plus en deux.
   *
   * Le découpage reste en second rideau, pour rattraper une saisie collée
   * telle quelle — « Noir, Blanc, Orange » dans un seul champ — sans laquelle
   * les trois teintes n'en formeraient qu'une, au nom absurde.
   */
  const couleurs = formData
    .getAll('couleurs')
    .flatMap((v) => String(v).split(/[,;\n]/))
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const resultat = await creerProduit({
    sku: String(formData.get('sku') ?? ''),
    nom: String(formData.get('nom') ?? ''),
    description: String(formData.get('description') ?? ''),
    prixMinor: Number.isFinite(prixSaisi) ? Math.round(prixSaisi) : -1,
    stockInitial: Number.isFinite(stockSaisi) ? Math.round(stockSaisi) : -1,
    categoryId,
    couleurs,
  });

  if (!resultat.ok) {
    return {
      erreurs: { [resultat.champ ?? 'general']: resultat.message },
      valeurs: {
        sku: String(formData.get('sku') ?? ''),
        nom: String(formData.get('nom') ?? ''),
        description: String(formData.get('description') ?? ''),
        prix: String(formData.get('prix') ?? ''),
        stock: String(formData.get('stock') ?? ''),
        couleurs: couleurs.join(', '),
        categoryId: categoryId ?? '',
      },
    };
  }

  /**
   * Les photos partent APRÈS la création, dans le même envoi.
   *
   * L'ordre compte : rien n'est déposé sur le stockage tant que le produit
   * n'existe pas. Une création refusée pour une référence en double ne laisse
   * donc aucun fichier orphelin, que personne ne viendrait jamais nettoyer.
   */
  const photos = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0);

  /**
   * Rang de la photo choisie pour la vitrine.
   *
   * Sans ce choix, la vitrine était TOUJOURS la première photo envoyée. Or on
   * téléverse dans l'ordre où les fichiers tombent, pas dans l'ordre où l'on
   * veut être vu : la photo d'emballage se retrouvait en devanture pendant que
   * la belle photo du produit dormait en troisième position.
   */
  const rangVitrine = Number(formData.get('photosVitrine') ?? 0);

  let echecs = 0;
  let idVitrine: string | null = null;

  if (photos.length > 0 && stockageConfigure()) {
    for (const [rang, photo] of photos.entries()) {
      const depot = await televerserImage(photo, `produits/${resultat.productId}`);
      if (!depot.ok) {
        echecs += 1;
        continue;
      }
      const image = await ajouterImage(resultat.productId, depot.url, '');
      if (rang === rangVitrine) idVitrine = image.id;
    }
  }

  /* Posé APRÈS le dépôt de toutes les photos : la première déposée est
     marquée d'office, et il faut donc corriger une fois l'ensemble en place. */
  if (idVitrine) await definirImagePrincipale(resultat.productId, idVitrine);

  revalidatePath('/admin/produits');
  // La boutique affiche ces images : sans cette invalidation, le propriétaire
  // les verrait dans l'administration mais pas sur le site avant 5 minutes.
  if (photos.length > echecs) revalidatePath('/', 'layout');

  /* Le compte d'échecs voyage dans l'URL : la fiche du produit ouvre alors sur
     un avertissement pointant la section « Photos », où l'envoi peut être
     refait et où le message d'erreur exact s'affiche. */
  const suffixe = echecs > 0 ? `&photosEchouees=${echecs}` : '';
  redirect(`/admin/produits/${resultat.productId}?cree=1${suffixe}`);
}

/* ═══════════════════ Édition, retrait et variantes ═══════════════════ */

export async function modifierTextesAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const productId = String(formData.get('productId') ?? '');
  const resultat = await modifierTextes(
    productId,
    String(formData.get('nom') ?? ''),
    String(formData.get('description') ?? ''),
  );

  if (!resultat.ok) return { error: resultat.message };

  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
  return { success: 'Nom et description enregistrés.' };
}

export async function archiverProduitAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const productId = String(formData.get('productId') ?? '');
  const archiver = formData.get('archiver') === '1';

  const resultat = await archiverProduit(productId, archiver);
  if (!resultat.ok) return { error: resultat.message };

  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
  return { success: archiver ? 'Produit archivé.' : 'Produit remis en brouillon.' };
}

/**
 * Supprime définitivement, puis renvoie vers la liste.
 *
 * La redirection n'a lieu QU'EN CAS DE SUCCÈS : après un refus, le propriétaire
 * doit rester sur la fiche pour lire pourquoi et choisir l'archivage.
 */
export async function supprimerProduitAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const resultat = await supprimerProduit(String(formData.get('productId') ?? ''));
  if (!resultat.ok) return { error: resultat.message };

  revalidatePath('/admin/produits');
  revalidatePath('/', 'layout');
  redirect('/admin/produits?supprime=1');
}

export async function ajouterVarianteAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const productId = String(formData.get('productId') ?? '');
  const delta = Number(String(formData.get('delta') ?? '0').replace(/\s/g, ''));
  const stock = Number(String(formData.get('stock') ?? '0').replace(/\s/g, ''));

  const resultat = await ajouterVariante(
    productId,
    String(formData.get('attribut') ?? ''),
    String(formData.get('valeur') ?? ''),
    Number.isFinite(delta) ? Math.round(delta) : Number.NaN,
    Number.isFinite(stock) ? Math.round(stock) : -1,
  );

  if (!resultat.ok) return { error: resultat.message };

  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
  return { success: 'Variante ajoutée.' };
}

export async function basculerVarianteAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  await basculerVariante(String(formData.get('variantId') ?? ''), formData.get('actif') === '1');

  revalidatePath(`/admin/produits/${String(formData.get('productId') ?? '')}`);
  revalidatePath('/', 'layout');
}

export async function supprimerVarianteAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  await supprimerVariante(String(formData.get('variantId') ?? ''));

  revalidatePath(`/admin/produits/${String(formData.get('productId') ?? '')}`);
  revalidatePath('/', 'layout');
}

/* ═══════════════════════════ Catégories ═══════════════════════════ */

export async function creerCategorieAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const resultat = await creerCategorie(
    String(formData.get('nom') ?? ''),
    String(formData.get('parentId') ?? '') || null,
    String(formData.get('iconName') ?? '') || null,
  );
  if (!resultat.ok) return { error: resultat.message };

  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
  return { success: 'Catégorie créée.' };
}

export async function renommerCategorieAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const resultat = await renommerCategorie(
    String(formData.get('categoryId') ?? ''),
    String(formData.get('nom') ?? ''),
  );
  if (!resultat.ok) return { error: resultat.message };

  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
  return { success: 'Nom enregistré.' };
}

export async function basculerCategorieAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  await basculerCategorie(String(formData.get('categoryId') ?? ''), formData.get('actif') === '1');

  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
}

export async function supprimerCategorieAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const resultat = await supprimerCategorie(String(formData.get('categoryId') ?? ''));
  if (!resultat.ok) return { error: resultat.message };

  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
  return { success: 'Catégorie supprimée.' };
}

/* ═══════════════════════════ Paliers de prix ═══════════════════════════ */

/**
 * Pose ou corrige un palier de prix.
 *
 * ⚠️ Le rôle est REVÉRIFIÉ ici, comme dans toute action d'administration : une
 * action serveur est un point d'entrée à part entière, appelable sans jamais
 * charger la page qui l'expose. Sans ce contrôle, n'importe qui pourrait fixer
 * le prix des produits de la boutique.
 */
export async function definirPalierAction(
  _precedent: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireActor();
  if (!actor) return { error: 'Action réservée à l’administration.' };

  const productId = String(formData.get('productId') ?? '');
  const quantite = Number(String(formData.get('quantite') ?? '').replace(/\s/g, ''));
  const prix = Number(String(formData.get('prix') ?? '').replace(/\s/g, ''));

  const resultat = await definirPalier(
    productId,
    Number.isFinite(quantite) ? Math.round(quantite) : -1,
    Number.isFinite(prix) ? Math.round(prix) : -1,
  );

  if (!resultat.ok) return { error: resultat.message };

  revalidatePath(`/admin/produits/${productId}`);
  // La grille est affichée sur la fiche publique : sans cette invalidation, le
  // client verrait l'ancien tarif pendant cinq minutes.
  revalidatePath('/', 'layout');
  return { success: 'Palier enregistré.' };
}

export async function supprimerPalierAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (!actor) return;

  const id = String(formData.get('palierId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  if (!id) return;

  await supprimerPalier(id);

  revalidatePath(`/admin/produits/${productId}`);
  revalidatePath('/', 'layout');
}
