import { NextResponse } from 'next/server';

import { exporterDonneesPersonnelles } from '@beralshopp/core';

import { getCurrentUser } from '@/lib/session';

/**
 * Téléchargement de l'intégralité des données personnelles du client.
 *
 * Une ROUTE et non une action de formulaire : une action serveur renvoie du
 * contenu à afficher, pas un fichier à enregistrer. Seul un en-tête
 * `Content-Disposition` déclenche un vrai téléchargement.
 *
 * ⚠️ Le fichier contient des données personnelles en clair. Deux précautions :
 *   • `no-store`, pour qu'aucun cache intermédiaire n'en garde une copie ;
 *   • aucune journalisation du contenu — la règle « ne jamais écrire de données
 *     personnelles dans les journaux » s'applique d'abord ici.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  }

  const donnees = await exporterDonneesPersonnelles(user.id);
  if (!donnees) {
    return NextResponse.json({ error: 'compte introuvable' }, { status: 404 });
  }

  const horodatage = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="beralshopp-mes-donnees-${horodatage}.json"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
