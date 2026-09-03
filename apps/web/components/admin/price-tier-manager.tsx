'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import type { PalierAdmin } from '@beralshopp/core';
import { BASE_CURRENCY, type CurrencyCode, formatMoney, money } from '@beralshopp/shared';

import {
  type AdminActionState,
  definirPalierAction,
  supprimerPalierAction,
} from '@/lib/admin-actions';

/**
 * Prix dégressifs d'un produit.
 *
 * « À partir de 10 pièces, l'unité coûte 5 126 Frw. »
 *
 * ON SAISIT UN PRIX, PAS UN POURCENTAGE. Un pourcentage se recalcule à chaque
 * changement du prix de base et dérive sans qu'on s'en aperçoive ; un prix
 * écrit reste ce qui a été décidé, et c'est exactement ce que le client lira sur
 * la fiche. C'est aussi ce qui permet de relire la grille et de vérifier qu'elle
 * dit ce qu'on croit.
 *
 * Le palier « 1 pièce » n'est pas à saisir : c'est le prix de vente, réglé plus
 * haut sur cette même fiche. Le dupliquer ici ouvrirait la porte à deux valeurs
 * contradictoires pour la même chose.
 */

const INITIAL: AdminActionState = {};

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="beral-btn-gold rounded-control inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {pending ? 'Enregistrement…' : 'Ajouter le palier'}
    </button>
  );
}

export function PriceTierManager({
  productId,
  paliers,
  basePriceMinor,
  currency = BASE_CURRENCY as CurrencyCode,
}: {
  readonly productId: string;
  readonly paliers: readonly PalierAdmin[];
  readonly basePriceMinor: number;
  readonly currency?: CurrencyCode;
}) {
  /* Les identifiants sont prefixes : la fiche porte deja un champ `prix`,
     celui du prix de vente. Deux elements de meme `id` sur une page rendent
     l etiquette ambigue — le clic sur « Prix unitaire » plaçait le curseur dans
     le champ de l autre formulaire, et le palier partait sans prix. Le `name`,
     lui, ne change pas : c est ce que lit l action serveur. */
  const [etat, action] = useActionState(definirPalierAction, INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);

  /**
   * Le formulaire se vide après chaque palier enregistré.
   *
   * On ajoute les paliers à la chaîne — 10, puis 50, puis 100 — et, un champ
   * de fichier mis à part, rien ne se réinitialise tout seul. Les anciennes
   * valeurs restaient donc en place : on tapait par-dessus, ou pire, on
   * recliquait et l'on renvoyait le palier précédent sans s'en apercevoir.
   * Mesuré : sur deux paliers ajoutés à la suite, un seul arrivait en base.
   *
   * `useActionState` renvoie un OBJET NEUF à chaque envoi, même quand le
   * message est identique. La dépendance porte donc sur `etat` et non sur
   * `etat.success`, qui ne changerait pas entre deux réussites de suite.
   */
  useEffect(() => {
    if (etat.success) formulaire.current?.reset();
  }, [etat]);

  return (
    <section className="border-border bg-surface rounded-card shadow-card border p-5">
      <h2 className="border-gold-400 text-content-muted border-s-2 ps-2 text-[0.65rem] font-semibold tracking-wider uppercase">
        Prix par quantité
      </h2>
      <p className="text-content-muted mt-2 text-xs">
        Le prix baisse à partir d’une certaine quantité. Le panier applique le palier tout seul, et
        le montant est figé au moment de la commande — modifier un palier ne réécrit jamais une
        commande déjà passée.
      </p>

      <ul className="divide-border border-border rounded-control mt-4 divide-y border">
        {/* Le prix unitaire ouvre toujours la grille : sans lui, on ne voit pas
            de quoi les paliers descendent. Il n'est pas modifiable ici — il se
            règle dans « Prix et publication ». */}
        <li className="bg-surface-muted flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="text-content-muted">1 pièce — prix de vente</span>
          <span className="beral-price text-content font-semibold">
            {formatMoney(money(basePriceMinor, currency), 'fr')}
          </span>
        </li>

        {paliers.length === 0 ? (
          <li className="text-content-muted px-3 py-3 text-sm">
            Aucun palier. Le produit se vend au même prix quelle que soit la quantité.
          </li>
        ) : (
          paliers.map((palier) => (
            <li key={palier.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-content text-sm">
                À partir de <strong className="beral-price">{palier.minQuantity}</strong> pièces
              </span>
              <span className="flex items-center gap-3">
                <span className="beral-price text-content font-semibold">
                  {formatMoney(money(palier.unitPriceMinor, currency), 'fr')}
                </span>
                {/* Suppression en POST, jamais en lien : un lien serait déclenché
                    par un préchargement du navigateur, sans clic de personne. */}
                <form action={supprimerPalierAction}>
                  <input type="hidden" name="palierId" value={palier.id} />
                  <input type="hidden" name="productId" value={productId} />
                  <button
                    type="submit"
                    aria-label={`Supprimer le palier à ${palier.minQuantity} pièces`}
                    className="text-content-muted hover:text-danger-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </span>
            </li>
          ))
        )}
      </ul>

      <form ref={formulaire} action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="productId" value={productId} />

        <div>
          <label htmlFor="palier-quantite" className="text-content block text-sm font-medium">
            À partir de
          </label>
          <input
            id="palier-quantite"
            name="quantite"
            type="text"
            inputMode="numeric"
            required
            placeholder="10"
            className="border-border bg-surface text-content rounded-control focus:border-gold-400 mt-1 w-28 border px-3 py-2 text-sm transition-colors outline-none"
          />
        </div>

        <div>
          <label htmlFor="palier-prix" className="text-content block text-sm font-medium">
            Prix unitaire (Frw)
          </label>
          <input
            id="palier-prix"
            name="prix"
            type="text"
            inputMode="numeric"
            required
            placeholder="5126"
            className="border-border bg-surface text-content rounded-control focus:border-gold-400 mt-1 w-36 border px-3 py-2 text-sm transition-colors outline-none"
          />
        </div>

        <Bouton />

        {etat.error ? (
          <p role="alert" className="text-danger-500 w-full text-sm font-medium">
            {etat.error}
          </p>
        ) : null}
        {etat.success ? (
          <p role="status" className="text-success-500 w-full text-sm font-medium">
            {etat.success}
          </p>
        ) : null}
      </form>
    </section>
  );
}
