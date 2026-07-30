import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { releaseExpiredReservations, reconcilePendingPayments } from '@beralshopp/core';

/**
 * Tâches périodiques.
 *
 * Deux traitements indispensables au bon fonctionnement de la boutique :
 *
 * 1. LIBÉRATION DU STOCK EXPIRÉ — sans elle, un panier abandonné au moment du
 *    paiement immobilise du stock indéfiniment, et la boutique affiche « rupture »
 *    sur des produits pourtant disponibles.
 *
 * 2. RÉCONCILIATION DES PAIEMENTS — rattrape les confirmations dont la notification
 *    n'est jamais arrivée. C'est ce qui évite les « j'ai payé mais ma commande
 *    n'apparaît pas », le pire scénario commercial : le client a payé, n'a rien
 *    reçu, et vous accuse.
 *
 * À déclencher toutes les 10 minutes par le planificateur Vercel (vercel.json) ou
 * tout autre appelant capable de fournir le secret.
 *
 * ⚠️ PROTÉGÉE PAR UN SECRET. Sans cela, n'importe qui pourrait déclencher la
 * libération de stock en boucle et perturber les commandes en cours.
 */

export const dynamic = 'force-dynamic';
/** Ces traitements peuvent dépasser le délai par défaut sur un gros volume. */
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const expected = process.env['CRON_SECRET'];
  // Pas de secret configuré = route désactivée. Refuser vaut mieux qu'ouvrir.
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Comparaison à durée constante : une comparaison classique laisse deviner le
  // secret caractère par caractère en mesurant le temps de réponse.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  }

  const startedAt = Date.now();

  // `allSettled` : un échec de la réconciliation (prestataire injoignable) ne doit
  // pas empêcher la libération du stock, et inversement.
  const [stock, payments] = await Promise.allSettled([
    releaseExpiredReservations(),
    reconcilePendingPayments(),
  ]);

  const result = {
    durationMs: Date.now() - startedAt,
    reservationsReleased: stock.status === 'fulfilled' ? stock.value : null,
    reservationsError: stock.status === 'rejected' ? 'échec' : null,
    payments: payments.status === 'fulfilled' ? payments.value : null,
    paymentsError: payments.status === 'rejected' ? 'échec' : null,
  };

  console.info('[tâches]', JSON.stringify(result));

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
