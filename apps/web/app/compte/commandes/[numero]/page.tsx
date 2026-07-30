import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { getUserOrder } from '@beralshopp/core';

import { OrderDetail } from '@/components/orders/order-detail';
import { cancelOrderAction } from '@/lib/order-actions';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Détail de la commande',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ numero: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { numero } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  // `getUserOrder` filtre sur l'utilisateur : une commande d'autrui renvoie 404,
  // jamais son contenu.
  const order = await getUserOrder(user.id, decodeURIComponent(numero));
  if (!order) notFound();

  const isCancellable = order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_FAILED';

  return (
    <>
      <Link
        href="/compte/commandes"
        className="text-content-muted hover:text-gold-700 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        Toutes mes commandes
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-content beral-price text-xl font-bold sm:text-2xl">
          {order.orderNumber}
        </h1>

        {isCancellable ? (
          <form action={cancelOrderAction}>
            <input type="hidden" name="orderNumber" value={order.orderNumber} />
            <button
              type="submit"
              className="border-border text-content-muted hover:border-danger-500 hover:text-danger-500 rounded-control border px-4 py-2 text-sm transition-colors"
            >
              Annuler la commande
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-6">
        <OrderDetail order={order} />
      </div>
    </>
  );
}
