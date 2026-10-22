import { ChevronLeftIcon } from './Icons'

/**
 * Le retour façon Komoot (V6 § 1, T-077) : un chevron et un texte vert, sans cadre ni fond, 44 px de haut.
 * Le chevron est aligné sur la marge de 16 px (son dessin commence 7 px après le bord de l’icône).
 * `onDark` : sur un en-tête coloré (compétence, mission), en blanc.
 */
export function BackLink({ label, onClick, onDark = false, className = '' }: { label: string; onClick: () => void; onDark?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-[7px] flex min-h-11 shrink-0 items-center gap-0.5 self-start border-0 bg-transparent py-0 pr-2 pl-0 text-[0.9412rem] font-semibold transition-opacity duration-150 active:opacity-55 ${onDark ? 'text-white' : 'text-primary'} ${className}`}
    >
      <ChevronLeftIcon size={24} strokeWidth={2.4} />
      {label}
    </button>
  )
}
