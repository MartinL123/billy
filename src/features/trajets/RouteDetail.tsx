import { lazy, Suspense, useMemo, useState } from 'react'
import { updateDog, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import type { EntryPhoto } from '../../firebase/types'
import type { ISODate } from '../../lib/dates'
import { deriveTraits, reactionsFromFears } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { durationLabel, formatRouteDistance, hasReaction, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { keepRoute } from './keepRoute'
import { PlaceMoment } from './PlaceMoment'
import { MomentIcon } from './momentIcons'
import { discoverZones } from '../../firebase/exploration'
import { formatDuration } from '../../lib/balade'

const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })))
const Tracer = lazy(() => import('./Tracer').then((m) => ({ default: m.Tracer })))

/** Le trajet dans le détail d'un moment : grande carte, distance · durée · moments, la liste, « Modifier le trajet ». */
export function RouteDetail({ entryId, date, route, photos, onPhoto }: { entryId: string; date: ISODate; route: Route; photos?: EntryPhoto[]; onPhoto?: (index: number) => void }) {
  const { routes, exploration } = useData()
  const [editing, setEditing] = useState(false)
  // Un toucher sur le tracé : un repère à cet endroit (rencontre, jeu, pipi, stress…).
  const [placing, setPlacing] = useState<{ lat: number; lng: number } | null>(null)
  const [missed, setMissed] = useState(false)
  const placed = useMemo(() => (photos ?? []).flatMap((p, index) => (p.lat !== undefined && p.lng !== undefined ? [{ index, thumbFileId: p.thumbFileId, lat: p.lat, lng: p.lng }] : [])), [photos])
  const saveMoments = (moments: Route['moments']) => updateEntryRoute(entryId, storeRoute({ ...route, moments }))
  const stats = [formatRouteDistance(route.distanceM), route.durationMin ? (route.source === 'gpx' ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section className="flex flex-col gap-3">
      <div className="h-[280px] overflow-hidden rounded-[20px] bg-placeholder">
        <Suspense fallback={null}>
          <RouteMap
            route={route}
            photos={placed}
            onPhoto={onPhoto}
            onTapRoute={(at) => {
              setMissed(false)
              setPlacing(at)
            }}
            onMissRoute={() => setMissed(true)}
          />
        </Suspense>
      </div>
      <p className={`-mt-1 text-[15px] ${missed ? 'font-semibold text-danger' : 'text-muted'}`}>{missed ? 'Touchez le tracé lui-même (ou tout près) pour y placer un repère.' : 'Touchez le tracé pour ajouter un repère.'}</p>
      <p className="text-[17px] font-bold">{stats}</p>
      {route.moments.length > 0 && (
        <ul className="card m-0 flex list-none flex-col p-0">
          {route.moments.map((m, i) => (
            <li key={i} className={`flex items-start gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <MomentIcon type={m.type} size={30} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[17px] font-semibold">{routeMomentInfo(m.type).label}</span>
                {(m.street || m.note) && <span className="text-[15px] text-muted">{[m.street, m.note].filter(Boolean).join(' · ')}</span>}
                <ToProfile reaction={momentReaction(m)} />
              </span>
              <button type="button" aria-label={`Retirer le repère ${routeMomentInfo(m.type).label}`} onClick={() => saveMoments(route.moments.filter((_, j) => j !== i))} className="btn btn-quiet min-h-11 shrink-0 px-2.5 text-[15px] text-muted">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setEditing(true)} className="btn border-2 border-solid border-[#9A4413] bg-surface text-[#9A4413]">
        Modifier le trajet
      </button>
      {placing && (
        <PlaceMoment
          at={placing}
          onCancel={() => setPlacing(null)}
          onPlace={(type, note, street) => {
            saveMoments([...route.moments, { ...placing, type, ...(note ? { note } : {}), ...(street ? { street } : {}) }])
            setPlacing(null)
          }}
        />
      )}
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
