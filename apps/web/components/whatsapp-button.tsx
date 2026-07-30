import { MessageCircle } from 'lucide-react';

/**
 * Bouton WhatsApp flottant.
 *
 * Demandé explicitement au cahier des charges, et justifié : au Rwanda comme dans
 * la plupart des marchés visés, WhatsApp est le canal de contact attendu. Un client
 * qui hésite écrit — ou n'achète pas.
 *
 * Choix d'implémentation :
 *   • composant SERVEUR, aucun JavaScript envoyé au navigateur ;
 *   • masqué si le numéro n'est pas configuré, plutôt que d'afficher un lien mort ;
 *   • `bottom` généreux sur mobile pour ne pas recouvrir les boutons d'achat des
 *     fiches produits — un bouton d'aide qui empêche d'acheter serait absurde.
 */
export function WhatsAppButton() {
  const number = process.env['NEXT_PUBLIC_WHATSAPP_NUMBER'] ?? '';
  if (!number) return null;

  const digits = number.replace(/\D/g, '');
  if (digits.length < 8) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous contacter sur WhatsApp"
      className="bg-success-500 fixed end-4 bottom-5 z-30 flex h-13 w-13 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 sm:end-6 sm:bottom-6"
      style={{ height: '3.25rem', width: '3.25rem' }}
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </a>
  );
}
