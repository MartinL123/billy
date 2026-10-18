import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { durationLabel, formatRouteDistance, type Route } from '../../lib/route'

/** Le panneau d’une balade ouverte sur la carte : ce qu’elle est, la revoir, y placer des repères. */
export function WalkPanel({ entryId, name, date, route, color, replaying, onReplay, onClose }: { entryId: string; name: string; date: string; route: Route; color?: string; replaying: boolean; onReplay: () => void; onClose: () => void }) {
  const stats = [formatLong(date), formatRouteDistance(route.distanceM), route.durationMin ? (route.source === 'gpx' ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section aria-label={name} className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] flex-col gap-2.5 rounded-t-[26px] bg-surface px-5 pt-3 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
      <div className="-ml-2 flex items-center justify-between">
        <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-1 border-0 bg-transparent px-2 text-[15px] font-bold text-primary">
          <ChevronLeftIcon size={18} />
          Toutes les balades
        </button>
        <Link to={`/souvenir/${entryId}`} className="flex min-h-11 items-center px-2 text-[15px] font-bold text-primary no-underline">
          Le souvenir
        </Link>
      </div>
      <div className="flex flex-col">
        <h1 className="flex items-center gap-2.5 font-display text-[22px] leading-tight font-extrabold">
          {color && <span className="h-1.5 w-6 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
          {name}
        </h1>
        <p className="text-[15px] text-muted">{stats}</p>
      </div>
      <p className="text-[15px] text-[#3F4946]">Touchez le tracé pour ajouter un repère, une autre balade pour l’ouvrir.</p>
      {route.points.length > 1 && (
        <button type="button" onClick={onReplay} className="btn btn-main min-h-[52px] gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {replaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
          </svg>
          {replaying ? 'Arrêter' : 'Revoir la balade'}
        </button>
      )}
    </section>
  )
}
