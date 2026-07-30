import { NextResponse } from 'next/server';
import { z } from 'zod';

import { suggest } from '@beralshopp/core';

/**
 * Suggestions de recherche.
 *
 * Première route de l'API publique versionnée `/api/v1`. Elle suit les règles posées
 * dans le dossier technique : la route VALIDE son entrée, appelle un service de
 * `@beralshopp/core`, formate la réponse. Aucune requête SQL ici.
 *
 * L'application mobile consommera exactement cette route.
 */

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get('q') ?? '' });

  // Entrée invalide : on renvoie une liste vide plutôt qu'une erreur. Une barre de
  // recherche ne doit jamais afficher de message d'erreur pendant la frappe.
  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const suggestions = await suggest(parsed.data.q);

  return NextResponse.json(
    { suggestions },
    {
      status: 200,
      headers: {
        // Mise en cache courte : les mêmes préfixes sont tapés en boucle par des
        // visiteurs différents. 60 secondes suffisent à absorber ces rafales sans
        // jamais masquer longtemps un produit nouvellement publié.
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
