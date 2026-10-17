import { lazy, Suspense, useState } from 'react'
import { updateDog, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { ISODate } from '../../lib/dates'
import { deriveTraits, reactionsFromFears } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { durationLabel, formatRouteDistance, hasReaction, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { keepRoute } from './keepRoute'
import { discoverZones } from '../../firebase/exploration'
import { formatDuration } from '../../lib/balade'

const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })))
const Tracer = lazy(() => import('./Tracer').then((m) => ({ default: m.Tracer })))

/** Le trajet dans le détail d'un moment : grande carte, distance · durée · moments, la liste, « Modifier le trajet ». */
export function RouteDetail({ entryId, date, route }: { entryId: string; date: ISODate; route: Route }) {
  const { routes, exploration } = useData()
  const [editing, setEditing] = useState(false)
  const stats = [formatRouteDistance(route.distanceM), route.durationMin ? (route.source === 'gpx' ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} moment${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
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
            <li key={i} className={`flex items-start gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <span className="mt-1.5 size-4 shrink-0 rounded-full" style={{ background: routeMomentInfo(m.type).color }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[17px] font-semibold">{routeMomentInfo(m.type).label}</span>
                {(m.street || m.note) && <span className="text-[15px] text-muted">{[m.street, m.note].filter(Boolean).join(' · ')}</span>}
                <ToProfile reaction={momentReaction(m)} />
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
              discoverZones(result.route.points, exploration)
            }}
          />
        </Suspense>
      )}
    </section>
  )
}

/** « A eu peur » / « A grogné » : l'ajouter à « Comment il réagit », seulement si on le choisit. */
function ToProfile({ reaction }: { reaction: ReturnType<typeof momentReaction> }) {
  const { dog } = useData()
  const today = useToday()
  if (!reaction) return null
  const current = dog.reactions ?? reactionsFromFears(dog.fears ?? [])
  if (hasReaction(current, reaction)) return <span className="mt-1 text-[15px] font-semibold text-primary">✓ Dans « Comment il réagit »</span>
  const add = () => {
    const reactions = [...current, reaction]
    updateDog({ reactions, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, dog.birthDate, today) })
  }
  return (
    <button type="button" onClick={add} className="mt-1 -ml-1 flex min-h-11 items-center self-start rounded-full border-0 bg-transparent px-1 text-left text-[15px] font-bold text-primary underline">
      Ajouter à « Comment il réagit »
    </button>
  )
}
