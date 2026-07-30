import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Lock, Smartphone } from 'lucide-react';

import { Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Moyens de paiement',
  description:
    'Payez sur Beralshopp par MTN Mobile Money, Airtel Money, Visa ou Mastercard. ' +
    'Paiement sécurisé, vos données bancaires ne transitent jamais par nos serveurs.',
  alternates: { canonical: '/paiement' },
};

const METHODS = [
  {
    icon: Smartphone,
    title: 'Mobile Money',
    text: 'MTN Mobile Money et Airtel Money. Vous recevez une demande de confirmation sur votre téléphone : validez avec votre code secret.',
  },
  {
    icon: CreditCard,
    title: 'Carte bancaire',
    text: 'Visa et Mastercard, y compris les cartes émises hors du Rwanda.',
  },
];

export default function PaymentPage() {
  return (
    <StaticPage
      title="Moyens de paiement"
      intro="Le paiement est traité par Pesapal, prestataire agréé."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {METHODS.map((method) => (
          <div key={method.title} className="border-border bg-surface rounded-card border p-5">
            <method.icon className="text-gold-600 h-6 w-6" aria-hidden />
            <h2 className="text-content mt-3 font-semibold">{method.title}</h2>
            <p className="text-content-muted mt-1 text-sm leading-relaxed">{method.text}</p>
          </div>
        ))}
      </div>

      <Section title="Vos données bancaires ne passent pas par nous">
        <p className="flex items-start gap-2">
          <Lock className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            La saisie du numéro de carte ou du code Mobile Money a lieu{' '}
            <strong className="text-content">sur la page sécurisée de notre prestataire</strong>,
            jamais sur Beralshopp. Nous ne voyons, ne stockons et ne transmettons aucune donnée
            bancaire.
          </span>
        </p>
      </Section>

      <Section title="Quand la commande est-elle confirmée ?">
        <p>
          Uniquement après <strong className="text-content">vérification par nos serveurs</strong>{' '}
          auprès du prestataire. Nous ne nous fions jamais au simple retour du navigateur : c’est ce
          qui empêche qu’une commande soit validée sans paiement réel.
        </p>
        <p>
          La confirmation prend généralement moins de deux minutes. Si elle tarde,{' '}
          <strong className="text-content">ne payez pas une seconde fois</strong> : le système
          vérifie automatiquement l’état du paiement et met votre commande à jour dès réception.
        </p>
      </Section>

      <Section title="Vos articles sont réservés 30 minutes">
        <p>
          Dès la commande passée, les articles sont retirés du stock disponible le temps que vous
          régliez. Passé ce délai sans paiement, ils sont remis en vente et la commande expire —
          vous pourrez la repasser si les articles sont encore disponibles.
        </p>
      </Section>

      <Section title="En cas de problème">
        <p>
          Si un paiement est débité sans que votre commande apparaisse comme payée,{' '}
          <Link href="/contact" className="text-gold-700 underline">
            contactez-nous
          </Link>{' '}
          avec votre numéro de commande. Chaque transaction est tracée de notre côté, ce qui permet
          de vérifier rapidement.
        </p>
      </Section>
    </StaticPage>
  );
}
