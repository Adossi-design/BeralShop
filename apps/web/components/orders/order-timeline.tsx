import { Check, CircleDot, XCircle } from 'lucide-react';

import type { OrderView } from '@beralshopp/core';

/**
 * Suivi visuel de la commande.
 *
 * Les libellés sont ceux qu'attend un client, pas les statuts techniques : il n'a
 * pas à connaître la différence entre « expirée » et « paiement échoué ». Une
 * commande interrompue (annulée, expirée, remboursée) n'affiche pas le parcours,
 * mais l'explication correspondante.
 */

const STEP_LABELS: Record<string, string> = {
  ORDER_RECEIVED: 'Commande reçue',
  PAYMENT_CONFIRMED: 'Paiement confirmé',
  PREPARING: 'Commande préparée',
  SHIPPED: 'Expédiée',
  OUT_FOR_DELIVERY: 'En livraison',
  DELIVERED: 'Livrée',
};

const INTERRUPTED: Record<string, string> = {
  CANCELLED: 'Cette commande a été annulée.',
  EXPIRED: 'Le délai de paiement a expiré. Les articles ont été remis en vente.',
  REFUNDED: 'Cette commande a été remboursée.',
};

export function OrderTimeline({ order }: { readonly order: OrderView }) {
  const interruption = INTERRUPTED[order.status];

  if (interruption) {
    return (
      <div className="border-danger-500/40 bg-danger-500/5 rounded-card flex items-start gap-3 border px-4 py-4">
        <XCircle className="text-danger-500 mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-danger-500 text-sm font-medium">{interruption}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {order.steps.map((step, index) => {
        const isDone = index <= order.progress;
        const isCurrent = index === order.progress;
        const isLast = index === order.steps.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  isDone ? 'bg-success-500 text-white' : 'bg-surface-muted text-content-muted'
                }`}
              >
                {isCurrent ? (
                  <CircleDot className="h-4 w-4" aria-hidden />
                ) : isDone ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                )}
              </span>
              {/* Le trait relie les étapes ; il disparaît après la dernière. */}
              {!isLast ? (
                <span
                  className={`w-px flex-1 ${isDone ? 'bg-success-500' : 'bg-border'}`}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p
                className={`text-sm ${isDone ? 'text-content font-medium' : 'text-content-muted'}`}
              >
                {STEP_LABELS[step] ?? step}
              </p>
              {isCurrent ? (
                <p className="text-content-muted mt-0.5 text-xs">Étape en cours</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
