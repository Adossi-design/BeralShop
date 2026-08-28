import Link from 'next/link';
import { FileText, RotateCcw, ShieldCheck } from 'lucide-react';

/**
 * Accès aux documents légaux.
 *
 * POURQUOI CE COMPOSANT EXISTE
 * Le pied de page est masqué sur téléphone et tablette. Or ces trois documents
 * doivent rester atteignables : un client doit pouvoir consulter à tout moment
 * ce qu'il accepte en achetant, ce qu'on fait de ses données, et comment il
 * retourne un article. Les enfermer derrière un pied de page invisible sur
 * l'appareil de la quasi-totalité des visiteurs reviendrait à ne pas les publier.
 *
 * Placé à la fois dans l'espace client ET sur la page de connexion : un visiteur
 * non connecté doit y accéder sans avoir à créer un compte.
 */

const DOCUMENTS = [
  { href: '/conditions', label: 'Conditions de vente', icon: FileText },
  { href: '/confidentialite', label: 'Confidentialité', icon: ShieldCheck },
  { href: '/retours', label: 'Retours et remboursements', icon: RotateCcw },
] as const;

export function LegalLinks({ className = '' }: { readonly className?: string }) {
  return (
    <nav aria-label="Informations légales" className={className}>
      <h2 className="text-content-muted text-xs font-semibold tracking-wide uppercase">
        Informations légales
      </h2>
      <ul className="mt-2 space-y-1">
        {DOCUMENTS.map((doc) => (
          <li key={doc.href}>
            <Link
              href={doc.href}
              className="text-content-muted hover:bg-surface-muted hover:text-gold-700 rounded-control flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
            >
              <doc.icon className="h-4 w-4 shrink-0" aria-hidden />
              {doc.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
