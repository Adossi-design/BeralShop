import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { verifyAndApplyPayment } from '@beralshopp/core';

export const metadata: Metadata = {
  title: 'Résultat du paiement',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Retour du client après paiement.
 *
 * ⚠️ AUCUN PARAMÈTRE DE CETTE URL N'EST CRU.
 *
 * Pesapal renvoie le client ici avec un `OrderTrackingId`. On s'en sert uniquement
 * pour interroger Pesapal depuis NOTRE serveur. Si l'on se fiait aux paramètres,
 * n'importe qui pourrait taper cette adresse avec « succès » et repartir avec la
 * marchandise sans avoir payé.
 *
 * La vérification est faite ici ET par l'IPN ET par la réconciliation : trois
 * chemins vers la même fonction, pour qu'aucun paiement ne se perde.
 */
export default async function PaymentReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const trackingId = single(params['OrderTrackingId']) || single(params['orderTrackingId']);
  const merchantReference =
    single(params['OrderMerchantReference']) || single(params['orderMerchantReference']);

  const outcome = trackingId ? await verifyAndApplyPayment(trackingId) : null;
  const orderNumber = outcome?.orderNumber ?? merchantReference;

  const status = outcome?.status ?? 'UNKNOWN';

  const view = {
    COMPLETED: {
      icon: CheckCircle2,
      className: 'border-success-500/40 bg-success-500/5',
      iconClass: 'text-success-500',
      title: 'Paiement confirmé',
      text: 'Merci. Votre commande est confirmée et va être préparée.',
    },
    PENDING: {
      icon: Clock,
      className: 'border-gold-300 bg-gold-50',
      iconClass: 'text-gold-700',
      title: 'Paiement en cours de confirmation',
      text:
        'Votre paiement est en cours de traitement. Cela prend généralement moins de ' +
        'deux minutes. Vous recevrez une confirmation dès qu’il sera validé — inutile ' +
        'de payer une seconde fois.',
    },
    FAILED: {
      icon: XCircle,
      className: 'border-danger-500/40 bg-danger-500/5',
      iconClass: 'text-danger-500',
      title: 'Paiement refusé',
      text:
        outcome?.message ??
        'Le paiement n’a pas abouti. Aucun montant n’a été prélevé. Vous pouvez réessayer.',
    },
    CANCELLED: {
      icon: XCircle,
      className: 'border-ink-200 bg-surface-muted',
      iconClass: 'text-content-muted',
      title: 'Paiement annulé',
      text: 'Vous avez annulé le paiement. Votre commande est conservée quelques minutes.',
    },
    REFUNDED: {
      icon: XCircle,
      className: 'border-ink-200 bg-surface-muted',
      iconClass: 'text-content-muted',
      title: 'Paiement remboursé',
      text: 'Cette transaction a été remboursée.',
    },
    UNKNOWN: {
      icon: Clock,
      className: 'border-gold-300 bg-gold-50',
      iconClass: 'text-gold-700',
      title: 'Vérification en cours',
      text:
        'Nous n’avons pas pu confirmer immédiatement votre paiement. Il sera vérifié ' +
        'automatiquement dans les minutes qui viennent. Consultez le suivi de votre ' +
        'commande, ou contactez-nous avec votre numéro de commande.',
    },
  }[status];

  const Icon = view.icon;

  return (
    <main id="contenu" className="beral-container flex-1 py-10">
      <div className="mx-auto max-w-2xl">
        <div className={`rounded-card flex items-start gap-3 border px-5 py-5 ${view.className}`}>
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${view.iconClass}`} aria-hidden />
          <div>
            <h1 className="text-content text-lg font-bold sm:text-xl">{view.title}</h1>
            <p className="text-content-muted mt-1 text-sm">{view.text}</p>
            {orderNumber ? (
              <p className="text-content-muted mt-2 text-sm">
                Commande : <strong className="beral-price text-content">{orderNumber}</strong>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {orderNumber ? (
            <Link
              href={`/commande/confirmation/${encodeURIComponent(orderNumber)}`}
              className="beral-btn-gold rounded-control px-6 py-3 font-semibold"
            >
              Voir ma commande
            </Link>
          ) : null}

          <Link
            href="/categories"
            className="border-border text-content hover:border-gold-400 rounded-control border px-6 py-3 font-medium transition-colors"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </main>
  );
}
