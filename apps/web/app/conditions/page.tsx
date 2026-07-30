import type { Metadata } from 'next';
import Link from 'next/link';

import { DraftNotice, Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description: 'Conditions générales de vente de la boutique en ligne Beralshopp.',
  alternates: { canonical: '/conditions' },
};

/**
 * ⚠️ BROUILLON DE TRAVAIL, NON VALIDÉ JURIDIQUEMENT.
 *
 * Ce texte couvre les points habituels d'une vente en ligne et sert de base de
 * discussion avec un juriste. Il ne remplace pas une rédaction professionnelle :
 * les mentions obligatoires varient selon le statut de l'entreprise et le droit
 * rwandais applicable.
 *
 * À compléter impérativement avant l'ouverture commerciale :
 *   • dénomination sociale exacte et forme juridique ;
 *   • numéro d'immatriculation (RDB) et numéro fiscal (TIN) ;
 *   • adresse du siège ;
 *   • obligations de facturation électronique EBM auprès de la RRA, le cas échéant.
 */
export default function TermsPage() {
  return (
    <StaticPage
      title="Conditions générales de vente"
      intro="Règles applicables à toute commande passée sur Beralshopp."
    >
      <DraftNotice>
        <strong>Document en cours de validation.</strong> Ce texte est un projet destiné à être relu
        par un juriste avant l’ouverture commerciale. Les mentions légales de l’entreprise
        (dénomination, immatriculation RDB, numéro fiscal TIN, siège) restent à compléter.
      </DraftNotice>

      <Section title="1. Objet">
        <p>
          Les présentes conditions régissent les ventes conclues sur le site Beralshopp entre
          l’exploitant du site et toute personne y passant commande, ci-après « le client ». Passer
          commande implique leur acceptation sans réserve.
        </p>
      </Section>

      <Section title="2. Produits et prix">
        <p>
          Les produits sont présentés avec la plus grande exactitude possible. Les photographies ont
          une valeur indicative et n’engagent pas sur des variations mineures d’aspect.
        </p>
        <p>
          Les prix sont indiqués en <strong className="text-content">francs rwandais (Frw)</strong>,
          toutes taxes comprises, hors frais de livraison. Ces derniers sont affichés avant la
          validation définitive de la commande.
        </p>
        <p>
          Le prix applicable est celui affiché au moment de la validation de la commande. Une
          modification ultérieure du tarif catalogue est sans effet sur une commande déjà passée.
        </p>
      </Section>

      <Section title="3. Disponibilité">
        <p>
          Les stocks sont mis à jour en continu. Dès la validation d’une commande, les articles sont
          réservés pendant <strong className="text-content">30 minutes</strong> le temps du
          règlement. À défaut de paiement dans ce délai, la commande expire et les articles sont
          remis en vente.
        </p>
        <p>
          En cas d’indisponibilité constatée après paiement, le client en est informé et remboursé
          de la part correspondante.
        </p>
      </Section>

      <Section title="4. Commande et paiement">
        <p>
          La commande devient ferme après confirmation du paiement par notre prestataire. Les moyens
          acceptés sont détaillés sur la page{' '}
          <Link href="/paiement" className="text-gold-700 underline">
            Moyens de paiement
          </Link>
          .
        </p>
        <p>
          Chaque commande reçoit un numéro unique permettant son suivi. Aucune donnée bancaire n’est
          collectée ni conservée par Beralshopp.
        </p>
      </Section>

      <Section title="5. Livraison">
        <p>
          Les zones, tarifs et délais figurent sur la page{' '}
          <Link href="/livraison" className="text-gold-700 underline">
            Livraison
          </Link>
          . Les délais courent à compter de la confirmation du paiement et sont donnés à titre
          indicatif.
        </p>
        <p>
          Le client s’assure de l’exactitude de l’adresse et de la joignabilité du numéro de
          téléphone communiqué. Une livraison échouée en raison d’informations erronées peut donner
          lieu à des frais de réexpédition.
        </p>
      </Section>

      <Section title="6. Retours et remboursements">
        <p>
          Les modalités sont décrites sur la page{' '}
          <Link href="/retours" className="text-gold-700 underline">
            Retours et remboursements
          </Link>
          .
        </p>
      </Section>

      <Section title="7. Données personnelles">
        <p>
          Le traitement des données est décrit dans la{' '}
          <Link href="/confidentialite" className="text-gold-700 underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section title="8. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit rwandais. Tout litige fera l’objet d’une
          tentative de résolution amiable avant toute action contentieuse.
        </p>
      </Section>
    </StaticPage>
  );
}
