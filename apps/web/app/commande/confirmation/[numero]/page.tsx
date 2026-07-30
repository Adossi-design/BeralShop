import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';

import { getOrderByNumber } from '@beralshopp/core';

import { OrderDetail } from '@/components/orders/order-detail';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ numero: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { numero } = await params;
  const order = await getOrderByNumber(decodeURIComponent(numero));

  if (!order) notFound();

  return (
    <main id="contenu" className="beral-container flex-1 py-8">
      <div className="border-success-500/40 bg-success-500/5 rounded-card flex items-start gap-3 border px-5 py-5">
        <CheckCircle2 className="text-success-500 mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <h1 className="text-content text-lg font-bold sm:text-xl">
            Merci, votre commande est enregistrée
          </h1>
          <p className="text-content-muted mt-1 text-sm">
            Notez votre numéro de commande :{' '}
            <strong className="beral-price text-content">{order.orderNumber}</strong>. Il vous
            permet de suivre votre colis à tout moment.
          </p>
        </div>
      </div>

      {/* Le délai de paiement est affiché : le stock est immobilisé pendant ce temps,
          et le client doit savoir qu'il n'est pas illimité. */}
      {order.status === 'PENDING_PAYMENT' ? (
        <p className="border-gold-300 bg-gold-50 text-gold-900 rounded-control mt-4 flex items-start gap-2 border px-4 py-3 text-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Votre commande est en attente de paiement. Les articles vous sont réservés pendant 30
            minutes. Le paiement par Mobile Money et carte bancaire sera activé très prochainement —
            nous vous contacterons au {order.contactPhone} pour finaliser.
          </span>
        </p>
      ) : null}

      <div className="mt-8">
        <OrderDetail order={order} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/categories" className="beral-btn-gold rounded-control px-6 py-3 font-semibold">
          Continuer mes achats
        </Link>
        <Link
          href={`/suivi?numero=${encodeURIComponent(order.orderNumber)}`}
          className="border-border text-content hover:border-gold-400 rounded-control border px-6 py-3 font-medium transition-colors"
        >
          Suivre ma commande
        </Link>
      </div>
    </main>
  );
}
