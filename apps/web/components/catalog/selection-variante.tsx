'use client';

import { type ReactNode, createContext, useContext, useMemo, useState } from 'react';

/**
 * Couleur choisie sur une fiche produit, partagée entre la galerie et le
 * sélecteur.
 *
 * POURQUOI UN CONTEXTE PLUTÔT QU'UN ÉTAT LOCAL
 * Le choix vivait dans le sélecteur. La galerie, rendue à côté par le serveur,
 * n'en savait rien : on choisissait « Blanc » et l'on continuait de voir les
 * photos du modèle noir. Les deux sont frères dans la mise en page, jamais
 * parent et enfant — seul un contexte posé au-dessus des deux peut les
 * accorder.
 *
 * Ce fournisseur enveloppe du contenu rendu sur le SERVEUR : le titre, le prix,
 * la réassurance ne deviennent pas pour autant du code client. Seuls les deux
 * composants qui lisent le contexte le sont, et ils l'étaient déjà.
 *
 * `useSelectionVariante` peut rendre `null`. C'est voulu : la galerie sert aussi
 * sur des écrans sans sélecteur, et elle doit y fonctionner sans fournisseur
 * plutôt que de refuser de s'afficher.
 */

interface Selection {
  readonly variantId: string;
  readonly choisir: (id: string) => void;
}

const Contexte = createContext<Selection | null>(null);

export function SelectionVariante({
  initial,
  children,
}: {
  readonly initial: string;
  readonly children: ReactNode;
}) {
  const [variantId, choisir] = useState(initial);
  const valeur = useMemo(() => ({ variantId, choisir }), [variantId]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSelectionVariante(): Selection | null {
  return useContext(Contexte);
}
