/**
 * Gabarit des pages de contenu.
 *
 * Largeur limitée à ~70 caractères par ligne : au-delà, l'œil perd la ligne suivante
 * en revenant à la marge. C'est la principale raison pour laquelle un texte pleine
 * largeur est pénible à lire sur grand écran.
 */
export function StaticPage({
  title,
  intro,
  updatedAt,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly updatedAt?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <main id="contenu" className="beral-container flex-1 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-content text-2xl font-bold sm:text-3xl">{title}</h1>
        {intro ? <p className="text-content-muted mt-2">{intro}</p> : null}
        {updatedAt ? (
          <p className="text-content-muted mt-1 text-xs">Dernière mise à jour : {updatedAt}</p>
        ) : null}

        <div className="mt-8 space-y-6">{children}</div>
      </div>
    </main>
  );
}

export function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-content text-lg font-semibold">{title}</h2>
      <div className="text-content-muted mt-2 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * Bandeau signalant un contenu à faire relire.
 *
 * Volontairement visible plutôt que discret : un texte juridique rédigé sans
 * juriste et publié tel quel expose réellement le commerçant. Mieux vaut que
 * l'avertissement dérange que l'inverse.
 */
export function DraftNotice({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="border-warning-500/40 bg-warning-500/5 text-warning-500 rounded-control border px-4 py-3 text-sm">
      {children}
    </p>
  );
}
