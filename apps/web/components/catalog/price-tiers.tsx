import { Layers } from 'lucide-react';

import type { ProductDetail } from '@beralshopp/core';
import { BASE_CURRENCY, type CurrencyCode, formatMoney, money } from '@beralshopp/shared';

/**
 * Grille des prix par quantité, sur la fiche produit.
 *
 * « 1 pièce : 5 234 Frw · 10 et plus : 5 126 Frw · 50 et plus : 5 018 Frw. »
 *
 * ELLE NE S'AFFICHE QUE S'IL Y A QUELQUE CHOSE À DIRE. Un produit sans palier
 * renvoie une grille d'une seule ligne — le prix unitaire, déjà écrit en gros
 * au-dessus. La répéter dans un tableau donnerait l'impression d'un tarif
 * dégressif qui n'existe pas.
 *
 * Le prix est écrit en toutes lettres à chaque palier, jamais en pourcentage :
 * c'est le montant qui sera débité, et c'est ce que le client veut comparer.
 */
export function PriceTiers({
  tiers,
  currency = BASE_CURRENCY as CurrencyCode,
}: {
  readonly tiers: ProductDetail['priceTiers'];
  readonly currency?: CurrencyCode;
}) {
  if (tiers.length < 2) return null;

  return (
    <section aria-labelledby="titre-paliers" className="border-border rounded-card border p-4">
      <h2
        id="titre-paliers"
        className="text-content-muted flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wider uppercase"
      >
        <Layers className="text-gold-600 h-3.5 w-3.5" aria-hidden />
        Plus vous en prenez, moins c’est cher
      </h2>

      {/* Défilement horizontal plutôt que retour à la ligne : sept paliers sur
          un téléphone se liraient sur trois rangées et l'on perdrait la
          progression, qui est justement l'information. */}
      <ul className="mt-3 flex [scrollbar-width:thin] gap-2 overflow-x-auto pb-1">
        {tiers.map((tier) => (
          <li
            key={tier.minQuantity}
            className="border-border bg-surface rounded-control min-w-24 shrink-0 border px-3 py-2 text-center"
          >
            <p className="text-content-muted text-xs whitespace-nowrap">
              {tier.minQuantity === 1 ? '1 pièce' : `${tier.minQuantity} et +`}
            </p>
            <p className="beral-price text-content mt-0.5 font-semibold whitespace-nowrap">
              {formatMoney(money(tier.unitPriceMinor, currency), 'fr')}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-content-muted mt-2 text-xs">
        Le prix s’ajuste tout seul dans votre panier dès que la quantité atteint un palier.
      </p>
    </section>
  );
}
