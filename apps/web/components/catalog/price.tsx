import type { PriceView } from '@beralshopp/core';
import { type Locale, formatMoney } from '@beralshopp/shared';

/**
 * Affichage d'un prix.
 *
 * Le formatage vient de `@beralshopp/shared` : jamais de `toLocaleString` ni de
 * concaténation manuelle dans un composant. C'est ce qui garantit qu'un prix
 * s'affiche « 15 000 Frw » partout, et que l'ajout d'une devise en V2 ne demandera
 * de modifier aucun composant.
 */

interface PriceProps {
  readonly price: PriceView;
  /** Le produit a plusieurs prix selon la variante → « À partir de ». */
  readonly showFrom?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly locale?: Locale;
}

const SIZES = {
  sm: { current: 'text-sm font-bold', compare: 'text-xs', badge: 'text-[0.65rem]' },
  md: { current: 'text-base font-bold', compare: 'text-sm', badge: 'text-xs' },
  lg: { current: 'text-2xl font-bold sm:text-3xl', compare: 'text-base', badge: 'text-sm' },
} as const;

export function Price({ price, showFrom, size = 'md', locale = 'fr' }: PriceProps) {
  const styles = SIZES[size];

  return (
    <span className="beral-price inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {showFrom ? <span className="text-content-muted text-xs">Dès</span> : null}

      <span className={`${styles.current} text-content`}>{formatMoney(price.amount, locale)}</span>

      {price.compareAt ? (
        <>
          <s className={`${styles.compare} text-content-muted`}>
            {formatMoney(price.compareAt, locale)}
          </s>
          <span
            className={`${styles.badge} bg-sale-500 rounded px-1.5 py-0.5 font-semibold text-white`}
          >
            −{price.discountPercent} %
          </span>
        </>
      ) : null}
    </span>
  );
}
