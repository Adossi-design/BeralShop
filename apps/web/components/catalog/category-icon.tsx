import {
  Baby,
  BookOpen,
  Car,
  Dumbbell,
  Gamepad2,
  Gem,
  House,
  Laptop,
  Palette,
  PawPrint,
  Pencil,
  ShoppingBasket,
  ShoppingBag,
  Shirt,
  Smartphone,
  Sparkles,
} from 'lucide-react';

/**
 * Icône d'une catégorie.
 *
 * La correspondance est explicite plutôt que dynamique : importer toute la
 * bibliothèque d'icônes pour n'en utiliser qu'une quinzaine alourdirait chaque page
 * de plusieurs centaines de kilooctets. Ici, seules les icônes listées sont incluses.
 *
 * Une catégorie créée depuis l'admin avec un nom d'icône inconnu retombe simplement
 * sur le sac de courses — jamais d'espace vide ni d'erreur.
 */
const ICONS = {
  smartphone: Smartphone,
  shirt: Shirt,
  house: House,
  sparkles: Sparkles,
  'shopping-basket': ShoppingBasket,
  laptop: Laptop,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  baby: Baby,
  'paw-print': PawPrint,
  car: Car,
  pencil: Pencil,
  gem: Gem,
  'gamepad-2': Gamepad2,
  palette: Palette,
} as const;

export function CategoryIcon({
  name,
  className,
}: {
  readonly name: string | null;
  readonly className?: string;
}) {
  const Icon = (name && ICONS[name as keyof typeof ICONS]) || ShoppingBag;
  return <Icon className={className} aria-hidden />;
}
