import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Package, Search, ShoppingBag, Truck, UserPlus } from 'lucide-react';

import { Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Comment commander ?',
  description:
    'Commander sur Beralshopp en quatre étapes : choisir un produit, remplir le panier, ' +
    'payer par Mobile Money ou carte, suivre la livraison.',
  alternates: { canonical: '/comment-commander' },
};

const STEPS = [
  {
    icon: Search,
    title: '1. Trouvez votre produit',
    text: 'Utilisez la barre de recherche en haut de chaque page — par nom, marque, catégorie ou référence — ou parcourez les rubriques. Vous pouvez filtrer par prix, disponibilité et promotions.',
  },
  {
    icon: ShoppingBag,
    title: '2. Ajoutez au panier',
    text: 'Choisissez la couleur, la taille ou l’option souhaitée, puis la quantité. Le panier affiche le sous-total, les frais de livraison estimés et le total. Vous pouvez modifier ou retirer un article à tout moment.',
  },
  {
    icon: UserPlus,
    title: '3. Renseignez la livraison',
    text: 'Indiquez le nom du destinataire, un numéro de téléphone joignable et l’adresse (province, district, secteur). Un point de repère aide beaucoup le livreur. Un compte n’est pas obligatoire, mais il permet de suivre vos commandes et de ne plus tout ressaisir.',
  },
  {
    icon: CreditCard,
    title: '4. Payez en toute sécurité',
    text: 'Vous êtes redirigé vers la page de paiement sécurisée de notre prestataire : MTN Mobile Money, Airtel Money, Visa ou Mastercard. Beralshopp ne voit jamais vos données bancaires.',
  },
];

export default function HowToOrderPage() {
  return (
    <StaticPage title="Comment commander ?" intro="Quatre étapes, de la recherche à la livraison.">
      <ol className="space-y-5">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="border-border bg-surface rounded-card flex gap-4 border p-5"
          >
            <span className="bg-gold-50 text-gold-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <step.icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="text-content block font-semibold">{step.title}</span>
              <span className="text-content-muted mt-1 block text-sm leading-relaxed">
                {step.text}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <Section title="Après la commande">
        <p className="flex items-start gap-2">
          <Package className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Vous recevez un <strong className="text-content">numéro de commande</strong> au format
            BRL-2026-000123. Notez-le : il permet de suivre votre colis à tout moment depuis la page{' '}
            <Link href="/suivi" className="text-gold-700 underline">
              Suivre ma commande
            </Link>
            , avec votre numéro de téléphone.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Truck className="text-gold-600 mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Votre commande passe par les étapes suivantes : reçue, paiement confirmé, préparée,
            expédiée, en livraison, livrée. Chaque changement est visible sur la page de suivi.
          </span>
        </p>
      </Section>

      <Section title="Une question avant d’acheter ?">
        <p>
          Écrivez-nous — nous répondons plus vite sur WhatsApp que par e-mail.{' '}
          <Link href="/contact" className="text-gold-700 underline">
            Voir les moyens de contact
          </Link>
          .
        </p>
      </Section>
    </StaticPage>
  );
}
