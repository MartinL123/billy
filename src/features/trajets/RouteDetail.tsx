import { Link } from 'react-router-dom'
import { Stats } from '../../components/Stats'
import { ChevronRightIcon } from '../../components/Icons'
import { RouteThumb } from './RouteThumb'
import { updateDog, updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { deriveTraits, reactionsFromFears } from '../../lib/questionnaire'
import { useToday } from '../../lib/useToday'
import { durationLabel, formatRouteDistance, hasReaction, momentReaction, routeMomentInfo, storeRoute, type Route } from '../../lib/route'
import { MomentIcon } from './momentIcons'
import { formatDuration } from '../../lib/balade'
import { place } from '../../lib/garden'

/** Le trajet dans le détail d’un moment : sa miniature, « Voir sur la carte » (la carte unique), les repères. */
export function RouteDetail({ entryId, route }: { entryId: string; route: Route }) {
  const saveMoments = (moments: Route['moments']) => updateEntryRoute(entryId, storeRoute({ ...route, moments }))
  const stats = [
    { value: formatRouteDistance(route.distanceM), label: 'Distance' },
    { value: route.durationMin ? (route.source ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', label: 'Durée' },
    { value: route.moments.length ? String(route.moments.length) : '', label: route.moments.length > 1 ? 'Repères' : 'Repère' },
  ]
  return (
    <section className="flex flex-col gap-3">
      <Link to={`/territoire?balade=${entryId}`} className="flex items-center gap-3 rounded-[20px] bg-surface p-3 text-text no-underline shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
        <RouteThumb points={route.points} moments={route.moments} size={88} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="title-card">Voir sur la carte</span>
          <span className="text-[0.8824rem] leading-snug text-muted">La revoir, ajouter un repère, ses photos</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>
      <Stats items={stats} />
      {route.source === 'watch' && <p className="source-note -mt-1">Enregistré par l’Apple Watch</p>}
      {route.moments.length > 0 && (
        <ul className="card m-0 flex list-none flex-col p-0">
          {route.moments.map((m, i) => (
            <li key={i} className={`flex items-start gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <MomentIcon type={m.type} size={30} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[1rem] font-semibold">{routeMomentInfo(m.type).label}</span>
                {(m.street || m.note) && <span className="text-[0.8824rem] text-muted">{[m.street, m.note].filter(Boolean).join(' · ')}</span>}
                <ToProfile reaction={momentReaction(m)} />
              </span>
              <button type="button" aria-label={`Retirer le repère ${routeMomentInfo(m.type).label}`} onClick={() => saveMoments(route.moments.filter((_, j) => j !== i))} className="btn-text shrink-0 px-2 text-muted">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {route.moments.some((m) => m.street) && <p className="source-note">Lieux © OpenStreetMap</p>}
    </section>
  )
}

/** « A eu peur » / « A grogné » : l’ajouter à « Comment il réagit », seulement si on le choisit. */
function ToProfile({ reaction }: { reaction: ReturnType<typeof momentReaction> }) {
  const { dog } = useData()
  const today = useToday()
  if (!reaction) return null
  const current = dog.reactions ?? reactionsFromFears(dog.fears ?? [])
  if (hasReaction(current, reaction)) return <span className="mt-1 text-[0.8824rem] font-semibold text-primary">✓ Dans « {place('Comment il réagit')} »</span>
  const add = () => {
    const reactions = [...current, reaction]
    updateDog({ reactions, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, dog.birthDate, today) })
  }
  return (
    <button type="button" onClick={add} className="btn-text mt-1 -ml-1 self-start text-left">
      Ajouter à « {place('Comment il réagit')} »
    </button>
  )
}
