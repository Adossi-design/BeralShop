import { NextResponse } from 'next/server';

import { prisma } from '@beralshopp/db';

/**
 * Point de contrôle de santé, pour la supervision externe.
 *
 * ⚠️ VOLONTAIREMENT AVARE EN INFORMATIONS.
 *
 * Cette route est publique : elle ne révèle donc ni version, ni nom d'hôte, ni
 * message d'erreur détaillé. Un point de santé bavard renseigne un attaquant sur
 * la pile technique et sur les moments de fragilité.
 *
 * Elle répond :
 *   200 — la base répond, le site peut servir des commandes
 *   503 — la base ne répond pas, il faut intervenir
 *
 * À brancher sur un service de surveillance (UptimeRobot, Better Stack…) avec une
 * alerte SMS. Sans supervision, une panne nocturne se découvre le lendemain matin
 * par un client mécontent.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const startedAt = Date.now();

  try {
    // Requête volontairement triviale : on mesure la disponibilité de la base,
    // pas la performance d'une requête métier.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: 'ok', database: 'up', latencyMs: Date.now() - startedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'down' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
