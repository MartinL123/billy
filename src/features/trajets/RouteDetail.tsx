import { lazy, Suspense, useState } from 'react'
import { updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { ISODate } from '../../lib/dates'
import { durationLabel, formatRouteDistance, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { keepRoute } from './keepRoute'

const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })))
const Tracer = lazy(() => import('./Tracer').then((m) => ({ default: m.Tracer })))

/** Le trajet dans le détail d'un moment : grande carte, distance · durée · moments, la liste, « Modifier le trajet ». */
export function RouteDetail({ entryId, date, route }: { entryId: string; date: ISODate; route: Route }) {
  const { routes } = useData()
  const [editing, setEditing] = useState(false)
  const stats = [formatRouteDistance(route.distanceM), route.durationMin ? durationLabel(route.durationMin) : '', route.moments.length ? `${route.moments.length} moment${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section className="flex flex-col gap-3">
      <div className="h-[280px] overflow-hidden rounded-[20px] bg-placeholder">
        <Suspense fallback={null}>
          <RouteMap route={route} />
        </Suspense>
      </div>
      <p className="text-[17px] font-bold">{stats}</p>
      {route.moments.length > 0 && (
        <ul className="card m-0 flex list-none flex-col p-0">
          {route.moments.map((m, i) => (
            <li key={i} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <span className="size-4 shrink-0 rounded-full" style={{ background: routeMomentInfo(m.type).color }} />
              <span className="flex flex-col">
                <span className="text-[17px] font-semibold">{routeMomentInfo(m.type).label}</span>
                {m.note && <span className="text-[15px] text-muted">{m.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setEditing(true)} className="btn border-2 border-solid border-[#9A4413] bg-surface text-[#9A4413]">
        Modifier le trajet
      </button>
      {editing && (
        <Suspense fallback={null}>
          <Tracer
            date={date}
            initial={route}
            onCancel={() => setEditing(false)}
            onDone={(result) => {
              setEditing(false)
              updateEntryRoute(entryId, storeRoute(result.route))
              keepRoute(result, routes)
            }}
          />
        </Suspense>
      )}
    </section>
  )
}
