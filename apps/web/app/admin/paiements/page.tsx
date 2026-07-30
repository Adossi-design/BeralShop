import type { Metadata } from 'next';
import { CreditCard, ScrollText } from 'lucide-react';

import { listAuditLog } from '@beralshopp/core';
import { prisma } from '@beralshopp/db';
import { formatMoney, money } from '@beralshopp/shared';

export const metadata: Metadata = {
  title: 'Paiements',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; className: string }> = {
  INITIATED: { label: 'Initié', className: 'bg-ink-100 text-ink-600' },
  PENDING: { label: 'En attente', className: 'bg-gold-100 text-gold-800' },
  COMPLETED: { label: 'Réussi', className: 'bg-success-500/10 text-success-500' },
  FAILED: { label: 'Échoué', className: 'bg-danger-500/10 text-danger-500' },
  CANCELLED: { label: 'Annulé', className: 'bg-ink-100 text-ink-600' },
  REFUNDED: { label: 'Remboursé', className: 'bg-ink-100 text-ink-600' },
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Paiements et journal d'audit.
 *
 * La table des paiements se remplira avec l'intégration Pesapal. En attendant, cet
 * écran affiche déjà le JOURNAL D'AUDIT des actions d'administration — qui, lui,
 * est actif depuis maintenant et répond à la question « qui a modifié ça ? ».
 */
export default async function AdminPaymentsPage() {
  const [payments, audit] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        provider: true,
        status: true,
        amountMinor: true,
        currency: true,
        methodDetail: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
    listAuditLog(25),
  ]);

  return (
    <>
      <h1 className="text-content text-xl font-bold sm:text-2xl">Paiements</h1>

      {payments.length === 0 ? (
        <div className="border-border bg-surface rounded-card mt-6 border border-dashed px-6 py-12 text-center">
          <CreditCard className="text-content-muted mx-auto h-8 w-8" aria-hidden />
          <p className="text-content mt-3 font-medium">Aucun paiement enregistré</p>
          <p className="text-content-muted mx-auto mt-2 max-w-md text-sm">
            L&apos;intégration Pesapal (Mobile Money, Visa, Mastercard) constitue le lot suivant.
            Cet écran listera alors chaque transaction avec son statut : réussie, échouée, en
            attente ou remboursée.
          </p>
        </div>
      ) : (
        <div className="border-border bg-surface rounded-card mt-6 overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-surface-muted text-content-muted text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Commande</th>
                  <th className="px-4 py-2.5 text-start font-medium">Prestataire</th>
                  <th className="px-4 py-2.5 text-start font-medium">Statut</th>
                  <th className="px-4 py-2.5 text-end font-medium">Montant</th>
                  <th className="px-4 py-2.5 text-start font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {payments.map((payment) => {
                  const meta = STATUS_META[payment.status] ?? {
                    label: payment.status,
                    className: 'bg-ink-100 text-ink-600',
                  };
                  return (
                    <tr key={payment.id}>
                      <td className="beral-price text-content px-4 py-3 font-medium">
                        {payment.order.orderNumber}
                      </td>
                      <td className="text-content-muted px-4 py-3">
                        {payment.provider}
                        {payment.methodDetail ? ` · ${payment.methodDetail}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[0.7rem] font-semibold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="beral-price text-content px-4 py-3 text-end font-semibold">
                        {formatMoney(money(payment.amountMinor, payment.currency as 'RWF'), 'fr')}
                      </td>
                      <td className="text-content-muted px-4 py-3 text-xs">
                        {dateFormat.format(payment.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ——— Journal d'audit ——— */}
      <section className="mt-8">
        <h2 className="text-content flex items-center gap-2 font-semibold">
          <ScrollText className="h-4 w-4" aria-hidden />
          Journal des actions d&apos;administration
        </h2>
        <p className="text-content-muted mt-1 text-sm">
          Chaque modification faite depuis cet espace est enregistrée, avec son auteur.
        </p>

        {audit.length === 0 ? (
          <p className="border-border bg-surface rounded-card text-content-muted mt-4 border border-dashed px-6 py-8 text-center text-sm">
            Aucune action enregistrée pour le moment.
          </p>
        ) : (
          <ul className="border-border bg-surface rounded-card divide-border mt-4 divide-y border">
            {audit.map((entry, index) => (
              <li
                key={`${entry.createdAt.getTime()}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="text-content">
                  <span className="beral-price font-medium">{entry.action}</span>
                  <span className="text-content-muted"> · {entry.entityType}</span>
                </span>
                <span className="text-content-muted text-xs">
                  {entry.actorName} · {dateFormat.format(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
