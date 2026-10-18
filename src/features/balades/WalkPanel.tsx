import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { durationLabel, formatRouteDistance, type Route } from '../../lib/route'

/** Le panneau d’une balade ouverte sur la carte : ce qu’elle est, la revoir, y placer des repères. */
export function WalkPanel({ entryId, name, date, route, replaying, missed, onReplay }: { entryId: string; name: string; date: string; route: Route; replaying: boolean; missed: boolean; onReplay: () => void }) {
  const stats = [formatLong(date), formatRouteDistance(route.distanceM), route.durationMin ? (route.source === 'gpx' ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section aria-label={name} className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] flex-col gap-2.5 rounded-t-[26px] bg-surface px-5 pt-3 pb-9 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]">
      <Link to={`/souvenir/${entryId}`} replace className="-ml-2 flex min-h-11 items-center gap-1 self-start px-2 text-[15px] font-bold text-primary no-underline">
        <ChevronLeftIcon size={18} />
        Le souvenir
      </Link>
      <div className="flex flex-col">
        <h1 className="font-display text-[22px] leading-tight font-extrabold">{name}</h1>
        <p className="text-[15px] text-muted">{stats}</p>
      </div>
      <p className={`text-[15px] ${missed ? 'font-semibold text-danger' : 'text-[#3F4946]'}`}>{missed ? 'Touchez le tracé lui-même (ou tout près) pour y placer un repère.' : 'Touchez le tracé pour ajouter un repère.'}</p>
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
