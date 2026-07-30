import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Great_Vibes } from 'next/font/google';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

import './globals.css';

const sans = Geist({
  variable: '--font-beralshopp-sans',
  subsets: ['latin'],
  display: 'swap',
});

/** Utilisée pour les numéros de commande et les références produit. */
const mono = Geist_Mono({
  variable: '--font-beralshopp-mono',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Script du logo. Une seule graisse, un seul usage : le nom de la marque.
 * Approximation de la calligraphie du logo en attendant son fichier vectoriel.
 */
const script = Great_Vibes({
  variable: '--font-beralshopp-script',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Beralshopp — Achetez en ligne, payez par Mobile Money',
    template: '%s · Beralshopp',
  },
  description:
    'Beralshopp : électronique, mode, maison et bien plus. Commandez en ligne et payez ' +
    'par MTN MoMo, Airtel Money ou carte bancaire. Livraison au Rwanda.',
  applicationName: 'Beralshopp',
  formatDetection: { telephone: true, address: false, email: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Volontairement non bloqué : empêcher le zoom nuit à l'accessibilité.
  maximumScale: 5,
  // Couleur de la barre du navigateur sur mobile : le noir du logo, dans les deux thèmes.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#08080a' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // `lang` et `dir` deviendront dynamiques avec next-intl en V2 (fr / en / ar).
    // La structure est déjà prête : passer à dir="rtl" suffira pour l'arabe.
    <html
      lang="fr"
      dir="ltr"
      className={`${sans.variable} ${mono.variable} ${script.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        {/* Lien d'évitement : premier élément focalisable, invisible tant qu'il n'a
            pas le focus. Indispensable pour la navigation au clavier. */}
        <a
          href="#contenu"
          className="rounded-control beral-btn-gold sr-only px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
        >
          Aller au contenu principal
        </a>

        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
