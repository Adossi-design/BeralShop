import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { Section, StaticPage } from '@/components/static-page';

export const metadata: Metadata = {
  title: 'Nous contacter',
  description:
    'Contactez Beralshopp par WhatsApp, téléphone ou e-mail. Réponse rapide pour toute ' +
    'question sur une commande, un produit ou une livraison.',
  alternates: { canonical: '/contact' },
};

const WHATSAPP = process.env['NEXT_PUBLIC_WHATSAPP_NUMBER'] ?? '';
const PHONE = process.env['NEXT_PUBLIC_CONTACT_PHONE'] ?? '';
const EMAIL = process.env['NEXT_PUBLIC_CONTACT_EMAIL'] ?? 'contact@beralshopp.com';

export default function ContactPage() {
  return (
    <StaticPage title="Nous contacter" intro="WhatsApp est le canal le plus rapide.">
      <div className="space-y-3">
        {/* WhatsApp en premier et en évidence : c'est le canal réellement utilisé
            au Rwanda comme dans la plupart des marchés visés. L'e-mail vient loin
            derrière dans les habitudes des acheteurs. */}
        {WHATSAPP ? (
          <a
            href={`https://wa.me/${WHATSAPP.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border-success-500/40 bg-success-500/5 rounded-card flex items-center gap-4 border p-5 transition-opacity hover:opacity-90"
          >
            <MessageCircle className="text-success-500 h-7 w-7 shrink-0" aria-hidden />
            <span>
              <span className="text-content block font-semibold">WhatsApp</span>
              <span className="text-content-muted beral-price block text-sm">{WHATSAPP}</span>
              <span className="text-content-muted block text-xs">
                Réponse la plus rapide, du lundi au samedi
              </span>
            </span>
          </a>
        ) : null}

        {PHONE ? (
          <a
            href={`tel:${PHONE}`}
            className="border-border bg-surface rounded-card hover:shadow-card flex items-center gap-4 border p-5 transition-shadow"
          >
            <Phone className="text-gold-600 h-6 w-6 shrink-0" aria-hidden />
            <span>
              <span className="text-content block font-semibold">Téléphone</span>
              <span className="text-content-muted beral-price block text-sm">{PHONE}</span>
            </span>
          </a>
        ) : null}

        <a
          href={`mailto:${EMAIL}`}
          className="border-border bg-surface rounded-card hover:shadow-card flex items-center gap-4 border p-5 transition-shadow"
        >
          <Mail className="text-gold-600 h-6 w-6 shrink-0" aria-hidden />
          <span>
            <span className="text-content block font-semibold">E-mail</span>
            <span className="text-content-muted block text-sm">{EMAIL}</span>
            <span className="text-content-muted block text-xs">
              Pour les demandes détaillées ou les pièces jointes
            </span>
          </span>
        </a>

        <div className="border-border bg-surface rounded-card flex items-center gap-4 border p-5">
          <MapPin className="text-gold-600 h-6 w-6 shrink-0" aria-hidden />
          <span>
            <span className="text-content block font-semibold">Adresse</span>
            <span className="text-content-muted block text-sm">Kigali, Rwanda</span>
          </span>
        </div>
      </div>

      <Section title="Pour aller plus vite">
        <p>
          Si votre question porte sur une commande,{' '}
          <strong className="text-content">indiquez son numéro</strong> (format BRL-2026-000123).
          Nous pourrons vérifier immédiatement son état, son paiement et sa livraison.
        </p>
        <p>
          Pour un simple suivi, la page{' '}
          <Link href="/suivi" className="text-gold-700 underline">
            Suivre ma commande
          </Link>{' '}
          donne la réponse instantanément, sans attendre.
        </p>
      </Section>

      <Section title="Questions fréquentes">
        <p>
          <strong className="text-content">Ma commande n’apparaît pas après paiement.</strong>{' '}
          Attendez deux minutes : la confirmation est vérifiée automatiquement. Ne payez pas une
          seconde fois. Si rien ne change, contactez-nous avec le numéro de commande.
        </p>
        <p>
          <strong className="text-content">Puis-je annuler ?</strong> Oui, tant que la commande
          n’est pas payée, depuis votre espace client. Après paiement, contactez-nous.
        </p>
        <p>
          <strong className="text-content">Le produit reçu ne convient pas.</strong> Voir les{' '}
          <Link href="/retours" className="text-gold-700 underline">
            conditions de retour
          </Link>
          .
        </p>
      </Section>
    </StaticPage>
  );
}
