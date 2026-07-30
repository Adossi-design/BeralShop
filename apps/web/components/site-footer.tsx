import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { BeralshopLogo } from './beralshop-logo';

/**
 * Pied de page.
 *
 * Le numéro WhatsApp est délibérément mis en avant : au Rwanda comme dans la plupart
 * des marchés visés, WhatsApp est le canal de contact attendu par les acheteurs, bien
 * avant l'e-mail. Un client qui hésite écrit sur WhatsApp — ou n'achète pas.
 *
 * Les coordonnées réelles seront renseignées par variables d'environnement au lot 9.
 */

const CONTACT = {
  whatsapp: process.env['NEXT_PUBLIC_WHATSAPP_NUMBER'] ?? '',
  phone: process.env['NEXT_PUBLIC_CONTACT_PHONE'] ?? '',
  email: process.env['NEXT_PUBLIC_CONTACT_EMAIL'] ?? 'contact@beralshop.com',
  city: 'Kigali, Rwanda',
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
      { href: '/comment-commander', label: 'Comment commander ?' },
      { href: '/livraison', label: 'Livraison' },
      { href: '/paiement', label: 'Moyens de paiement' },
      { href: '/contact', label: 'Nous contacter' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface-muted mt-auto border-t">
      <div className="beral-container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* ——— Marque et contact ——— */}
          <div className="lg:col-span-2">
            <BeralshopLogo />
            <p className="text-content-muted mt-3 max-w-sm text-sm">
              Achetez en ligne en toute confiance et payez par Mobile Money ou carte bancaire.
              Livraison au Rwanda, et bientôt dans toute l&apos;Afrique.
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
                <li className="text-content-muted flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                  <a href={`tel:${CONTACT.phone}`} className="hover:text-content">
                    {CONTACT.phone}
                  </a>
                </li>
              ) : null}
              <li className="text-content-muted flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-content">
                  {CONTACT.email}
                </a>
              </li>
              <li className="text-content-muted flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {CONTACT.city}
              </li>
            </ul>
          </div>

          {/* ——— Liens ——— */}
          {SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-content text-sm font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-content-muted hover:text-brand-700 transition-colors"
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

      <div className="border-border border-t">
        <div className="beral-container text-content-muted flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Beralshop. Tous droits réservés.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/conditions" className="hover:text-content">
                Conditions de vente
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="hover:text-content">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link href="/retours" className="hover:text-content">
                Retours et remboursements
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
