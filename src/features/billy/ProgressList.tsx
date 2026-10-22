import { Link } from 'react-router-dom'
import { progressDate, type ProgressItem } from '../../lib/billyPage'

/** La pastille d’un progrès : coche dorée = étape acquise, étoile = « Super rappel », sourire = séance « Super ». */
function Mark({ kind }: { kind: ProgressItem['kind'] }) {
  const gold = kind === 'etape'
  return (
    <span aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full ${gold ? 'bg-[#E8B33A] text-gold-dark' : 'bg-primary-soft text-primary'}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={kind === 'rappel' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={kind === 'rappel' ? 0 : 3} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'etape' && <path d="M5 12.5l4.5 4.5L19 7.5" />}
        {kind === 'rappel' && <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />}
        {kind === 'seance' && (
          <>
            <circle cx="12" cy="12" r="9" strokeWidth="2.4" />
            <path d="M8.5 14a4.5 4.5 0 0 0 7 0" strokeWidth="2.4" />
          </>
        )}
      </svg>
    </span>
  )
}

/**
 * Le fil daté de ses progrès : une grille commune (date, pastille, texte) pour que les colonnes restent alignées
 * quelle que soit la date (« Aujourd’hui » est plus long que « 20 oct. »).
 */
export function ProgressList({ items, today, back }: { items: ProgressItem[]; today: string; /** Libellé du retour sur l’écran ouvert. */ back: string }) {
  return (
    <ul className="m-0 grid list-none grid-cols-[max-content_28px_minmax(0,1fr)] gap-x-2 p-0">
      {items.map((item) => (
        <li key={item.id} className="col-span-3 grid grid-cols-subgrid border-0 border-b border-solid border-divider last:border-b-0">
          <Link to={item.to} state={{ retour: back }} className="tap col-span-3 grid min-h-11 grid-cols-subgrid items-start py-2.5 text-text no-underline">
            <span className="pt-0.5 text-[0.7647rem] font-bold whitespace-nowrap text-muted">{progressDate(item.date, today)}</span>
            <Mark kind={item.kind} />
            <span className="flex min-w-0 flex-col">
              <span className="leading-snug font-semibold">{item.title}</span>
              {item.detail && <span className="truncate text-[0.8235rem] text-muted">{item.detail}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
