'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Package, Search } from 'lucide-react';

/**
 * Barre de recherche avec suggestions.
 *
 * Contraintes tenues ici :
 *  • ANTI-REBOND de 220 ms : sans lui, taper « écouteur » déclencherait huit requêtes.
 *    Sur une connexion lente, ces requêtes se doublent et arrivent dans le désordre.
 *  • RÉPONSES PÉRIMÉES IGNORÉES : chaque requête porte un numéro de séquence. Une
 *    réponse arrivée en retard ne peut pas écraser une plus récente — c'est le bug
 *    classique des autocomplétions, où l'on voit s'afficher les résultats d'un mot
 *    déjà effacé.
 *  • FONCTIONNE SANS JAVASCRIPT : le formulaire soumet vers /recherche. Les
 *    suggestions ne sont qu'un confort supplémentaire, jamais une dépendance.
 *  • Navigation au clavier complète (flèches, Entrée, Échap).
 */

interface Suggestion {
  type: 'product' | 'category';
  label: string;
  href: string;
}

interface SearchBoxProps {
  readonly variant: 'desktop' | 'mobile';
}

export function SearchBox({ variant }: SearchBoxProps) {
  const router = useRouter();
  const inputId = useId();
  const listId = useId();

  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  /** Numéro de la dernière requête émise, pour écarter les réponses périmées. */
  const requestSeq = useRef(0);

  const term = value.trim();
  /** En dessous de deux caractères, tout remonte : la suggestion n'aide plus. */
  const canSuggest = term.length >= 2;
  /**
   * Visibilité DÉRIVÉE du rendu, et non stockée dans un état remis à zéro depuis
   * l'effet. Appeler setState de façon synchrone dans un effet déclenche un second
   * rendu en cascade à chaque frappe — exactement ce qu'il faut éviter dans un champ
   * de saisie.
   */
  const isVisible = isOpen && canSuggest && suggestions.length > 0;

  useEffect(() => {
    if (!canSuggest) return;

    const seq = (requestSeq.current += 1);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/v1/recherche/suggestions?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((data: { suggestions?: Suggestion[] }) => {
          // Une réponse plus ancienne que la dernière requête est ignorée.
          if (seq !== requestSeq.current) return;
          setSuggestions(data.suggestions ?? []);
          setIsOpen((data.suggestions ?? []).length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          // Réseau coupé ou requête annulée : on n'affiche rien. La recherche
          // classique par soumission du formulaire reste disponible.
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, canSuggest]);

  // Fermeture au clic à l'extérieur.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      const target = suggestions[activeIndex];
      if (target) {
        event.preventDefault();
        setIsOpen(false);
        router.push(target.href);
      }
    }
  }

  const isDesktop = variant === 'desktop';

  return (
    <div ref={containerRef} className="relative w-full">
      <form action="/recherche" role="search">
        <label htmlFor={inputId} className="sr-only">
          Rechercher un produit
        </label>

        <Search
          className="text-ink-400 pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5"
          aria-hidden
        />

        <input
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setIsOpen(suggestions.length > 0)}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={
            isDesktop
              ? 'Rechercher un produit, une marque, une référence…'
              : 'Rechercher un produit…'
          }
          className={`border-ink-700 bg-ink-900 text-ink-50 placeholder:text-ink-400 focus:border-gold-500 rounded-control h-11 w-full border ps-11 focus:outline-none ${
            isDesktop ? 'pe-28 text-sm' : 'pe-3 text-base'
          }`}
        />

        {isDesktop ? (
          <button
            type="submit"
            className="beral-btn-gold absolute inset-y-1 end-1 rounded-[0.5rem] px-4 text-sm font-semibold"
          >
            Chercher
          </button>
        ) : null}
      </form>

      {isVisible ? (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-surface shadow-raised rounded-control absolute inset-x-0 top-full z-50 mt-1 overflow-hidden border py-1"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.href}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <a
                href={suggestion.href}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  index === activeIndex ? 'bg-gold-50 text-gold-900' : 'text-content'
                }`}
              >
                {suggestion.type === 'category' ? (
                  <LayoutGrid className="text-gold-600 h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <Package className="text-content-muted h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="truncate">{suggestion.label}</span>
                {suggestion.type === 'category' ? (
                  <span className="text-content-muted ms-auto shrink-0 text-xs">Catégorie</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
