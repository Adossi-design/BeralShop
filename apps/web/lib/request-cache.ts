import { cache } from 'react';

import { getCategoryBySlug, getProductBySlug } from '@beralshopp/core';

/**
 * Mémoïsation à l'échelle d'UNE requête HTTP.
 *
 * Next.js appelle `generateMetadata` puis le composant de page pour la même
 * requête. Les deux ont besoin du même produit : sans mémoïsation, c'est deux
 * fois la même requête SQL, donc deux allers-retours réseau vers la base — pour
 * un résultat rigoureusement identique.
 *
 * `cache()` de React dédoublonne ces appels pendant le rendu d'une requête, puis
 * oublie tout. Ce n'est PAS un cache entre visiteurs : deux clients qui chargent
 * la même fiche déclenchent bien deux requêtes. La fraîcheur des prix et du stock
 * est donc inchangée — seule la redondance interne disparaît.
 *
 * La mémoïsation vit ici, dans la couche web, et non dans `@beralshopp/core` :
 * `cache()` vient de React, et le domaine métier ne doit rien savoir du framework
 * qui l'appelle. C'est ce qui permettra à l'application mobile de réutiliser
 * `core` tel quel.
 */

export const getProduct = cache(getProductBySlug);
export const getCategory = cache(getCategoryBySlug);
