import { NextResponse } from 'next/server';

import { verifyAndApplyPayment } from '@beralshopp/core';

/**
 * Notification de paiement Pesapal (IPN).
 *
 * ⚠️ CETTE NOTIFICATION N'EST PAS UNE PREUVE DE PAIEMENT.
 *
 * Elle n'est qu'un signal : « il s'est passé quelque chose sur cette transaction ».
 * On en extrait l'identifiant, puis NOTRE serveur rappelle Pesapal avec ses propres
 * identifiants pour connaître le vrai statut. Le contenu de cette requête n'est
 * jamais cru sur parole — n'importe qui peut l'appeler.
 *
 * Pesapal l'invoque en GET avec :
 *   OrderTrackingId, OrderMerchantReference, OrderNotificationType
 *
 * On répond TOUJOURS 200 avec l'accusé attendu. Un code d'erreur déclencherait des
 * renvois en boucle, alors même que la réconciliation périodique rattrape déjà les
 * cas manqués.
 */

export const dynamic = 'force-dynamic';

function acknowledge(orderTrackingId: string, merchantReference: string, status: number) {
  return NextResponse.json({
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId,
    orderMerchantReference: merchantReference,
    status,
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const orderTrackingId = url.searchParams.get('OrderTrackingId') ?? '';
  const merchantReference = url.searchParams.get('OrderMerchantReference') ?? '';

  if (!orderTrackingId) {
    return acknowledge('', merchantReference, 500);
  }

  try {
    const outcome = await verifyAndApplyPayment(orderTrackingId);

    if (!outcome) {
      // Transaction inconnue de notre base : on accuse réception sans rien faire.
      // Insister ferait tourner Pesapal en boucle pour rien.
      console.warn(`[IPN] transaction inconnue : ${orderTrackingId}`);
      return acknowledge(orderTrackingId, merchantReference, 200);
    }

    console.info(
      `[IPN] ${outcome.orderNumber} → ${outcome.status}${outcome.changed ? ' (commande mise à jour)' : ''}`,
    );
    return acknowledge(orderTrackingId, merchantReference, 200);
  } catch (error) {
    console.error('[IPN] échec de la vérification :', error);
    // 200 malgré l'erreur : la réconciliation reprendra ce paiement.
    return acknowledge(orderTrackingId, merchantReference, 200);
  }
}

/** Pesapal peut être configuré en POST : même traitement. */
export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
