'use client';

import { useActionState } from 'react';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { type EtatSuppression, supprimerMonCompteAction } from '@/lib/personal-data-actions';

/**
 * Export et suppression des données personnelles.
 *
 * La suppression est présentée sans détour : ce qui disparaît, ce qui est
 * conservé, et pourquoi. Une formulation vague pousserait le client à cliquer
 * sans comprendre, puis à se plaindre de la conservation des commandes.
 */

const INITIAL: EtatSuppression = {};

function BoutonSupprimer() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-danger-500 rounded-control inline-flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {pending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
    </button>
  );
}

export function PersonalDataPanel() {
  const [etat, action] = useActionState(supprimerMonCompteAction, INITIAL);

  return (
    <div className="space-y-8">
      {/* ——— Export ——— */}
      <section className="border-border bg-surface rounded-card border p-5">
        <h2 className="text-content text-lg font-bold">Télécharger mes données</h2>
        <p className="text-content-muted mt-2 text-sm">
          Un fichier contenant l’intégralité de ce que Beralshopp détient sur vous : votre compte,
          vos adresses, vos commandes et leurs paiements, vos avis, vos notifications et
          l’historique de vos connexions. Ce sont les données réellement enregistrées, pas un
          résumé.
        </p>
        <p className="text-content-muted mt-2 text-sm">
          Le condensé de votre mot de passe en est absent : c’est un secret de sécurité, et le
          diffuser dans un fichier affaiblirait votre compte.
        </p>

        {/* Lien et non bouton : c'est un téléchargement, pas une modification. */}
        <a
          href="/api/v1/mes-donnees"
          download
          className="border-border text-content hover:border-gold-400 hover:text-gold-700 rounded-control mt-4 inline-flex items-center gap-2 border px-5 py-2.5 font-medium transition-colors"
        >
          <Download className="h-4 w-4" aria-hidden />
          Télécharger au format JSON
        </a>
      </section>

      {/* ——— Suppression ——— */}
      <section className="border-danger-500/40 bg-danger-500/5 rounded-card border p-5">
        <h2 className="text-content flex items-center gap-2 text-lg font-bold">
          <AlertTriangle className="text-danger-500 h-5 w-5" aria-hidden />
          Supprimer mon compte
        </h2>

        <p className="text-content mt-3 text-sm font-semibold">Ce qui sera effacé :</p>
        <ul className="text-content-muted mt-1.5 list-disc space-y-1 ps-5 text-sm">
          <li>votre compte, votre nom, votre téléphone et votre e-mail ;</li>
          <li>vos adresses de livraison enregistrées ;</li>
          <li>votre panier en cours ;</li>
          <li>vos avis sur les produits ;</li>
          <li>vos connexions en cours, sur tous vos appareils.</li>
        </ul>

        <p className="text-content mt-4 text-sm font-semibold">Ce qui sera conservé :</p>
        <p className="text-content-muted mt-1.5 text-sm">
          Vos commandes passées, mais <strong>vidées de toute donnée vous concernant</strong> : nom,
          téléphone, e-mail, adresse de livraison et notes sont effacés. Seuls subsistent les
          montants, les dates, les articles et le statut — la loi fiscale impose de conserver ces
          pièces comptables plusieurs années. Après suppression, plus rien dans ces commandes ne
          permet de remonter jusqu’à vous.
        </p>

        <p className="text-danger-500 mt-4 text-sm font-semibold">
          Cette action est irréversible. Aucun de nous ne pourra revenir en arrière.
        </p>

        <form action={action} className="mt-5 space-y-3">
          <div>
            <label htmlFor="motDePasse" className="text-content block text-sm font-medium">
              Votre mot de passe
            </label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              autoComplete="current-password"
              required
              className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-sm border px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="confirmation" className="text-content block text-sm font-medium">
              Tapez <span className="font-mono font-bold">SUPPRIMER</span> pour confirmer
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              required
              className="border-border bg-surface text-content rounded-control mt-1 w-full max-w-sm border px-3 py-2.5 text-sm"
            />
          </div>

          {etat.erreur ? (
            <p role="alert" className="text-danger-500 text-sm font-medium">
              {etat.erreur}
            </p>
          ) : null}

          <BoutonSupprimer />
        </form>
      </section>
    </div>
  );
}
