import { Star } from 'lucide-react';

/**
 * Note en étoiles.
 *
 * Un produit sans avis n'affiche RIEN plutôt que zéro étoile : cinq étoiles vides
 * ressemblent à une mauvaise note alors qu'elles signifient « pas encore d'avis ».
 * C'est une différence qui pèse sur la décision d'achat.
 */
interface StarRatingProps {
  readonly value: number;
  readonly count: number;
  readonly size?: 'sm' | 'md';
  readonly showCount?: boolean;
}

export function StarRating({ value, count, size = 'sm', showCount = true }: StarRatingProps) {
  if (count === 0) return null;

  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const rounded = Math.round(value);

  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Noté ${value.toFixed(1)} sur 5, ${count} avis`}
    >
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((position) => (
          <Star
            key={position}
            className={`${starSize} ${
              position <= rounded ? 'fill-gold-400 text-gold-400' : 'text-ink-300'
            }`}
          />
        ))}
      </span>
      {showCount ? (
        <span className="text-content-muted text-xs" aria-hidden>
          ({count})
        </span>
      ) : null}
    </span>
  );
}
