import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const sans = Geist({
  variable: '--font-beralshop-sans',
  subsets: ['latin'],
  display: 'swap',
});

/** Utilisée pour les numéros de commande et les références produit. */
const mono = Geist_Mono({
  variable: '--font-beralshop-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Beralshop — Achetez en ligne, payez par Mobile Money',
    template: '%s · Beralshop',
  },
  description:
    'Beralshop : électronique, mode, maison et bien plus. Commandez en ligne et payez ' +
    'par MTN MoMo, Airtel Money ou carte bancaire. Livraison au Rwanda.',
  applicationName: 'Beralshop',
  formatDetection: { telephone: true, address: false, email: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Volontairement non bloqué : empêcher le zoom nuit à l'accessibilité.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a7c6d' },
    { media: '(prefers-color-scheme: dark)', color: '#032622' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // `lang` et `dir` deviendront dynamiques avec next-intl en V2 (fr / en / ar).
    // La structure est déjà prête : passer à dir="rtl" suffira pour l'arabe.
    <html lang="fr" dir="ltr" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        {/* Lien d'évitement : premier élément focalisable, invisible tant qu'il n'a
            pas le focus. Indispensable pour la navigation au clavier. */}
        <a
          href="#contenu"
          className="rounded-control bg-brand-600 sr-only px-4 py-2 font-medium text-white focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50"
        >
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
