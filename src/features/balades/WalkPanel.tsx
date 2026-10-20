import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { durationLabel, formatRouteDistance, type Route } from '../../lib/route'
import { useSheet } from './useSheet'

/**
 * Le panneau d’une balade ouverte sur la carte : ce qu’elle est, la revoir, y placer des repères. Il se glisse vers le
 * bas comme le panneau des balades (même geste) : réduit, il garde le nom de la balade et la carte prend l’écran.
 */
export function WalkPanel({ entryId, name, date, route, color, replaying, onReplay, onClose, readOnly = false }: { readOnly?: boolean; entryId: string; name: string; date: string; route: Route; color?: string; replaying: boolean; onReplay: () => void; onClose: () => void }) {
  const sheet = useSheet({ startCollapsed: false })
  const stats = [formatLong(date), formatRouteDistance(route.distanceM), route.durationMin ? (route.source ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section
      ref={sheet.ref}
      aria-label={name}
      {...sheet.handlers}
      style={sheet.style}
      className={`absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-[calc(100%-50dvh)] max-w-[430px] ${sheet.scrollable && !sheet.collapsed ? '' : 'touch-pan-x'} flex-col gap-2.5 rounded-t-[26px] bg-surface px-5 pt-2 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]`}
    >
      <button type="button" onClick={() => sheet.setCollapsed(!sheet.collapsed)} aria-expanded={!sheet.collapsed} aria-label={sheet.collapsed ? 'Afficher le panneau' : 'Réduire le panneau'} className="mx-auto -mb-2 flex min-h-11 w-24 shrink-0 touch-none items-center justify-center border-0 bg-transparent">
        <span className="h-1.5 w-11 rounded-full bg-line-strong" />
      </button>
      <div className="-ml-2 flex shrink-0 items-center justify-between">
        <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-1 border-0 bg-transparent px-2 text-[0.8824rem] font-bold text-primary">
          <ChevronLeftIcon size={18} />
          Toutes les balades
        </button>
        <Link to={`/souvenir/${entryId}`} className="flex min-h-11 items-center px-2 text-[0.8824rem] font-bold text-primary no-underline">
          Le souvenir
        </Link>
      </div>
      <h1 className="flex shrink-0 items-center gap-2.5 font-display text-[1.2941rem] leading-tight font-extrabold">
        {color && <span className="h-1.5 w-6 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
        {name}
      </h1>
      {/* Réduit, le panneau ne garde que ce qui précède (le nom) : la suite glisse sous la barre. */}
      <div ref={sheet.bodyRef} style={sheet.bodyStyle} className="-mx-5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-5 [&>*]:shrink-0" aria-hidden={sheet.collapsed || undefined} inert={sheet.collapsed || undefined}>
        <p className="text-[0.8824rem] text-muted">{stats}</p>
        <p className="text-[0.8824rem] text-[#3F4946]">{readOnly ? 'Touchez une autre balade pour l’ouvrir.' : 'Touchez le tracé pour ajouter un repère, une autre balade pour l’ouvrir.'}</p>
        {route.points.length > 1 && (
          <button type="button" onClick={onReplay} className="btn btn-main min-h-[52px] gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {replaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
            {replaying ? 'Arrêter' : 'Revoir la balade'}
          </button>
        )}
      </div>
    </section>
  )
}
