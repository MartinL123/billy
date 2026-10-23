import { useState, type ReactNode } from 'react'
import { isToTell, routeMomentInfo } from '../../lib/route'
import { TIMELINE_PREVIEW, timelineText, type TimelineEvent } from '../../lib/walkTimeline'
import { PencilIcon } from '../../components/Icons'
import { MomentIcon } from './momentIcons'

/** Le rond d’une ligne de la frise : départ et retour en vert, arrêt numéroté, repère, moment rapide, cœur. */
function EventDot({ event }: { event: TimelineEvent }) {
  const base = 'flex size-[26px] shrink-0 items-center justify-center rounded-full text-[0.7059rem] font-bold text-white'
  switch (event.kind) {
    case 'depart':
    case 'retour':
      return (
        <span aria-hidden="true" className={`${base} bg-primary`}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">{event.kind === 'depart' ? <path d="M2 1l7 4-7 4z" /> : <rect x="1.5" y="1.5" width="7" height="7" rx="1" />}</svg>
        </span>
      )
    case 'stop':
      return (
        <span aria-hidden="true" className={base} style={{ background: event.moment?.type === 'peur' ? '#C4423A' : '#5C6662' }}>
          {event.number}
        </span>
      )
    case 'moment':
      return <MomentIcon type={event.moment.type} size={26} />
    case 'fast':
      return (
        <span aria-hidden="true" className={`${base} bg-route-fast text-gold-dark`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /></svg>
        </span>
      )
    case 'heart':
      return (
        <span aria-hidden="true" className={`${base} bg-[#C4423A]`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" /></svg>
        </span>
      )
  }
}

/**
 * La frise « Ce qui s’est passé » (V6 § 6.2) : une ligne par événement, l’heure à gauche. `preview` : les 5 premières
 * lignes, puis « Voir toute la balade ». `renderExtra` : ce qui s’ajoute sous une ligne (les tuiles d’un arrêt).
 * `onOpenStop` (T-107) : chaque arrêt se touche et ouvre « Raconter la balade » sur lui ; un arrêt raconté montre sa
 * réponse avec un petit crayon.
 */
export function WalkTimeline({ events, startTime, preview = false, renderExtra, onOpenStop }: { events: TimelineEvent[]; startTime?: string; preview?: boolean; renderExtra?: (event: TimelineEvent) => ReactNode; onOpenStop?: (stopIndex: number) => void }) {
  const [all, setAll] = useState(!preview)
  const shown = all ? events : events.slice(0, TIMELINE_PREVIEW)
  const hasClock = Boolean(startTime) && events.some((e) => e.atS !== undefined)
  return (
    <div className="card flex flex-col px-4 py-1.5">
      {/* R-095 : la colonne des heures prend la largeur de la plus longue (« 10 h 49 » sur une ligne, chiffres à largeur
          fixe) ; chaque ligne reprend les colonnes de la liste (subgrid). */}
      <ol className={`m-0 grid list-none gap-x-2.5 p-0 ${hasClock ? 'grid-cols-[max-content_26px_minmax(0,1fr)]' : 'grid-cols-[26px_minmax(0,1fr)]'}`}>
        {shown.map((event, i) => {
          const { title, detail, clock } = timelineText(event, startTime)
          // Un repère « À raconter » sur un arrêt : pas de pastille, les tuiles le remplacent (T-086).
          const moment = event.kind === 'stop' && event.moment && !isToTell(event.moment) ? event.moment : undefined
          const open = event.kind === 'stop' && onOpenStop ? () => onOpenStop(event.stopIndex) : undefined
          const head = (
            <>
              {hasClock && <span className="pt-1 text-[0.7647rem] font-bold whitespace-nowrap text-muted tabular-nums">{clock}</span>}
              <EventDot event={event} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.9412rem] leading-snug font-semibold">{title}</span>
                {detail && <span className="text-[0.8235rem] leading-snug text-muted">{detail}</span>}
                {moment && (
                  <span className="mt-1 flex items-center gap-1.5 self-start rounded-full py-0.5 pr-2.5 pl-0.5 text-[0.7647rem] font-bold whitespace-nowrap text-text" style={{ background: `${routeMomentInfo(moment.type).color}1F` }}>
                    <MomentIcon type={moment.type} size={20} />
                    {routeMomentInfo(moment.type).label}
                    {open && <PencilIcon size={13} className="opacity-60" />}
                  </span>
                )}
              </span>
            </>
          )
          const extra = renderExtra?.(event)
          return (
            <li key={`${event.kind}-${event.atS ?? i}-${i}`} className={`col-span-full grid grid-cols-subgrid py-2.5 ${i ? 'border-t border-divider' : ''}`}>
              {open ? (
                <button type="button" onClick={open} aria-label={`${clock ? `${clock}, ` : ''}${title}${detail ? `, ${detail}` : ''}${moment ? `, ${routeMomentInfo(moment.type).label}` : ''}. ${moment ? 'Changer' : 'Raconter'} cet arrêt`} className="tap col-span-full grid min-h-11 grid-cols-subgrid items-start rounded-field border-0 bg-transparent p-0 text-left text-text">
                  {head}
                </button>
              ) : (
                <div className="col-span-full grid grid-cols-subgrid items-start">{head}</div>
              )}
              {extra && <div className="col-[-2/-1] mt-1.5 flex flex-col">{extra}</div>}
            </li>
          )
        })}
      </ol>
      {!all && events.length > TIMELINE_PREVIEW && (
        <button type="button" onClick={() => setAll(true)} className="btn-text -ml-1 self-start">
          Voir toute la balade
        </button>
      )}
    </div>
  )
}
