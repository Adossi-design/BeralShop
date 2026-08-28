import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { BOUTIQUE, BOUTIQUE_LOCALISATION } from '@beralshopp/shared';

import { BeralshoppLogo } from './beralshopp-logo';

/**
 * Pied de page.
 *
 * Le numéro WhatsApp est délibérément mis en avant : au Rwanda comme dans la plupart
 * des marchés visés, WhatsApp est le canal de contact attendu par les acheteurs, bien
 * avant l'e-mail. Un client qui hésite écrit sur WhatsApp — ou n'achète pas.
 */

const CONTACT = {
  whatsapp: BOUTIQUE.whatsapp,
  phone: BOUTIQUE.telephone,
  email: BOUTIQUE.email,
  city: BOUTIQUE_LOCALISATION,
};

const SECTIONS = [
  {
    title: 'Acheter',
    links: [
      { href: '/categories', label: 'Toutes les catégories' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/nouveautes', label: 'Nouveaux arrivages' },
      { href: '/meilleures-ventes', label: 'Meilleures ventes' },
    ],
  },
  {
    title: 'Mon compte',
    links: [
      { href: '/compte', label: 'Mon espace' },
      { href: '/compte/commandes', label: 'Mes commandes' },
      { href: '/suivi', label: 'Suivre ma commande' },
      { href: '/compte/adresses', label: 'Mes adresses' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { href: '/livraison', label: 'Livraison' },
      { href: '/paiement', label: 'Moyens de paiement' },
      { href: '/contact', label: 'Nous contacter' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="beral-surface-brand mt-auto">
      <div className="beral-rule-gold" aria-hidden />
      <div className="beral-container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* ——— Marque et contact ——— */}
          <div className="lg:col-span-2">
            <BeralshoppLogo onDark />
            <p className="text-ink-300 mt-3 max-w-sm text-sm">
              Achetez en ligne en toute confiance et payez par Mobile Money ou carte bancaire.
              Livraison gratuite partout en Afrique.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              {CONTACT.whatsapp ? (
                <li>
                  <a
                    href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-control bg-success-500 inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="h-5 w-5" aria-hidden />
                    Nous écrire sur WhatsApp
                  </a>
                </li>
              ) : null}
              {CONTACT.phone ? (
                <li className="text-ink-300 flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  <a href={`tel:${CONTACT.phone}`} className="hover:text-gold-300">
                    {CONTACT.phone}
                  </a>
                </li>
              ) : null}
              <li className="text-ink-300 flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-gold-300">
                  {CONTACT.email}
                </a>
              </li>
              <li className="text-ink-300 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {CONTACT.city}
              </li>
            </ul>
          </div>

          {/* ——— Liens ——— */}
          {SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-gold-300 text-sm font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink-300 hover:text-gold-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-ink-800 border-t">
        <div className="beral-container text-ink-400 flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Beralshopp. Tous droits réservés.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/conditions" className="hover:text-gold-300">
                Conditions de vente
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="hover:text-gold-300">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link href="/retours" className="hover:text-gold-300">
                Retours et remboursements
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
