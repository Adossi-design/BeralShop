import type { Metadata } from 'next';
import Link from 'next/link';

import { DraftNotice, Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Retours et remboursements',
  description:
    'Conditions de retour et de remboursement des commandes Beralshopp : délais, ' +
    'produits concernés, démarche à suivre.',
  alternates: { canonical: '/retours' },
};

/**
 * ⚠️ BROUILLON DE TRAVAIL.
 *
 * Les délais et exclusions proposés ici sont des valeurs COURANTES du commerce en
 * ligne, pas des obligations légales rwandaises vérifiées. Ils doivent être arbitrés
 * par le commerçant puis relus juridiquement : une politique de retour trop généreuse
 * coûte cher, une politique trop stricte peut être inopposable.
 */
export default function ReturnsPage() {
  return (
    <StaticPage
      title="Retours et remboursements"
      intro="Ce qui se passe si un produit ne convient pas."
    >
      <DraftNotice>
        <strong>Politique à arbitrer.</strong> Les délais et exclusions ci-dessous sont des valeurs
        courantes du commerce en ligne, proposées comme point de départ. Ils doivent être décidés
        par le commerçant puis validés juridiquement avant l’ouverture.
      </DraftNotice>

      <Section title="Produit endommagé, défectueux ou non conforme">
        <p>
          Si le produit reçu est abîmé, ne fonctionne pas, ou ne correspond pas à celui commandé,{' '}
          <strong className="text-content">contactez-nous sous 48 heures</strong> après réception,
          avec votre numéro de commande et des photos.
        </p>
        <p>
          Nous procédons alors à un remplacement ou à un remboursement intégral, frais de livraison
          compris. Les frais de retour sont à notre charge.
        </p>
      </Section>

      <Section title="Changement d’avis">
        <p>
          Un retour est accepté dans un délai de <strong className="text-content">7 jours</strong>{' '}
          après réception, à condition que le produit soit{' '}
          <strong className="text-content">non utilisé</strong>, dans son emballage d’origine,
          complet et revendable en l’état.
        </p>
        <p>
          Dans ce cas, les frais de retour restent à la charge du client et les frais de livraison
          initiaux ne sont pas remboursés.
        </p>
      </Section>

      <Section title="Produits non repris">
        <p>Pour des raisons d’hygiène ou de nature, ne peuvent être repris :</p>
        <ul className="ms-4 list-disc space-y-1">
          <li>les produits d’hygiène, de beauté et de soin descellés ;</li>
          <li>les sous-vêtements et maillots de bain ;</li>
          <li>les denrées alimentaires et les produits périssables ;</li>
          <li>les produits personnalisés à la demande ;</li>
          <li>les contenus numériques téléchargés ou activés.</li>
        </ul>
      </Section>

      <Section title="Comment procéder">
        <ol className="ms-4 list-decimal space-y-2">
          <li>
            <Link href="/contact" className="text-gold-700 underline">
              Contactez-nous
            </Link>{' '}
            en indiquant votre numéro de commande et le motif du retour. WhatsApp est le canal le
            plus rapide.
          </li>
          <li>Nous vous confirmons l’acceptation du retour et l’adresse d’envoi.</li>
          <li>
            Expédiez le produit. Conservez la preuve d’envoi : sans elle, un colis perdu ne peut pas
            être remboursé.
          </li>
          <li>
            Après réception et vérification, le remboursement est déclenché sous 7 jours ouvrés.
          </li>
        </ol>
      </Section>

      <Section title="Délai de remboursement">
        <p>
          Le remboursement est effectué sur le moyen de paiement d’origine. Le délai de mise à
          disposition dépend ensuite de votre opérateur Mobile Money ou de votre banque, et peut
          prendre quelques jours supplémentaires — ce délai ne dépend pas de nous.
        </p>
      </Section>

      <Section title="Commande non encore payée ou non expédiée">
        <p>
          Tant qu’une commande n’est pas payée, vous pouvez l’annuler vous-même depuis votre{' '}
          <Link href="/compte/commandes" className="text-gold-700 underline">
            espace client
          </Link>
          , sans aucun frais. Après paiement mais avant expédition, contactez-nous rapidement :
          l’annulation reste généralement possible.
        </p>
      </Section>
    </StaticPage>
  );
}
