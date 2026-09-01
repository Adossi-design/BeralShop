import { ConsoleCorps, ConsoleEnTete } from '@/components/admin/console';

/**
 * Écran d'attente de l'espace d'administration.
 *
 * POURQUOI IL EXISTE
 * Toutes les pages d'administration sont en `force-dynamic` : elles ne peuvent
 * pas être mises en cache, puisqu'elles montrent l'état réel de la boutique à
 * l'instant présent. Chaque navigation attend donc le serveur.
 *
 * Sans ce fichier, Next garde l'ANCIENNE page affichée pendant toute l'attente,
 * figée, sans le moindre signe de vie. Mesuré sur la production : 2,8 s pour la
 * première page ouverte après une pause — le temps que la fonction serveur
 * démarre — puis 50 ms pour les suivantes. Ce sont ces 2,8 s d'écran mort qui
 * donnent le sentiment que l'espace d'administration est lent, alors que le
 * rendu lui-même tient en 96 ms et que la base répond en 3 ms.
 *
 * Ce squelette ne raccourcit rien. Il rend l'attente VISIBLE, et le clic reste
 * annulable : on peut repartir ailleurs au lieu de cliquer trois fois en croyant
 * que le bouton n'a pas répondu.
 *
 * VOLONTAIREMENT GÉNÉRIQUE. Il couvre tous les écrans de la section — tableau de
 * bord, commandes, produits, catégories, clients, paiements. Reproduire la mise
 * en page de l'un d'eux ferait clignoter les cinq autres vers une forme qui
 * n'est pas la leur.
 */

function Bloc({ className }: { readonly className: string }) {
  return <div className={`bg-ink-200/60 rounded ${className}`} aria-hidden />;
}

export default function ChargementAdmin() {
  return (
    <>
      <ConsoleEnTete>
        <div className="animate-pulse">
          <Bloc className="h-7 w-48" />
          <Bloc className="mt-2 h-3 w-72" />
        </div>
      </ConsoleEnTete>

      <ConsoleCorps>
        {/* `role="status"` avec `aria-live="polite"` : un lecteur d'écran annonce
            le chargement au lieu de laisser croire que la page est vide. */}
        <div role="status" aria-live="polite" className="mt-5 animate-pulse">
          <span className="sr-only">Chargement en cours…</span>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border-border bg-surface rounded-card shadow-card h-14 border" />
            <div className="border-border bg-surface rounded-card shadow-card h-14 border" />
            <div className="border-border bg-surface rounded-card shadow-card h-14 border" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="border-border bg-surface rounded-card shadow-card h-64 border lg:col-span-2" />
            <div className="border-border bg-surface rounded-card shadow-card h-64 border" />
          </div>
        </div>
      </ConsoleCorps>
    </>
  );
}
