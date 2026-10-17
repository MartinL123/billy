import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { RouteThumb } from './RouteThumb'
import { updateDog, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { deriveTraits, reactionsFromFears } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { durationLabel, formatRouteDistance, hasReaction, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { MomentIcon } from './momentIcons'
import { formatDuration } from '../../lib/balade'

/** Le trajet dans le détail d'un moment : sa miniature, « Voir sur la carte » (la carte unique), les repères. */
export function RouteDetail({ entryId, route }: { entryId: string; route: Route }) {
  const saveMoments = (moments: Route['moments']) => updateEntryRoute(entryId, storeRoute({ ...route, moments }))
  const stats = [formatRouteDistance(route.distanceM), route.durationMin ? (route.source === 'gpx' ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', route.moments.length ? `${route.moments.length} repère${route.moments.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')
  return (
    <section className="flex flex-col gap-3">
      <Link to={`/territoire?balade=${entryId}`} className="flex items-center gap-3 rounded-[20px] bg-surface p-3 text-text no-underline shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
        <RouteThumb points={route.points} moments={route.moments} size={88} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold">Voir sur la carte</span>
          <span className="text-[15px] leading-snug text-muted">La revoir, ajouter un repère, ses photos</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>
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
