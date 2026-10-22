import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { Stats } from '../../components/Stats'
import { useData } from '../../firebase/store'
import { formatDuration } from '../../lib/balade'
import { loopLevel, walkMinutes } from '../../lib/loops'
import { formatRouteDistance } from '../../lib/route'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { walkItems } from '../../lib/walkList'
import { isNative } from '../../native'
import { WalkMap } from '../trajets/WalkMap'
import { dogName } from '../../lib/dogName'

/**
 * Une boucle pour Billy (spec V6 § 8.2, T-089) : la carte de la balade passée et « Partir en balade ». Pendant la
 * balade, ce tracé reste affiché en pointillés (`?boucle=` dans l’adresse de « Balade en cours »).
 */
export default function LoopScreen() {
  const { id = '' } = useParams()
  const { dog, entries } = useData()
  const today = useToday()
  const back = useBack('/territoire')
  const item = useMemo(() => walkItems(entries).find((w) => w.id === id), [entries, id])
  // Juste le tracé : pas d’arrêts ni de repères, c’est un chemin à refaire.
  const path = useMemo(() => (item ? { ...item.route, stops: [], moments: [], pace: undefined } : undefined), [item])
  if (!item || !path || !isNative()) return <Navigate to="/territoire" replace />
  const minutes = walkMinutes(item.route)
  const level = loopLevel(item.route.distanceM, dog.birthDate, today)

  return (
    <main className="fixed inset-0 mx-auto flex max-w-[430px] flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        <WalkMap route={path} dogName={dog.name} className="h-full" />
        <div className="absolute top-0 left-0 z-10 px-4 pt-[calc(env(safe-area-inset-top)+4px)]">
          <span className="block rounded-full bg-surface/95 pr-1 shadow-float">
            <BackLink label="La carte" onClick={back} className="pl-[7px]" />
          </span>
        </div>
      </div>
      <section aria-label={`Boucle pour ${dogName(dog)}`} className="panel flex flex-col gap-3 px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-primary surtitre">Boucle pour {dogName(dog)}</span>
          <h1 className="title-section">{item.name}</h1>
          <p className="text-[0.9412rem] text-muted">{level} · déjà faite ensemble</p>
        </div>
        <Stats items={[{ value: formatRouteDistance(item.route.distanceM), label: 'Distance' }, { value: formatDuration(minutes), label: 'Durée' }]} />
        <p className="text-[0.8824rem] leading-snug text-[#3F4946]">Le chemin reste affiché en pointillés pendant la balade.</p>
        <Link to={`/balade-en-cours?depart=1&boucle=${encodeURIComponent(item.id)}`} className="tap btn btn-main min-h-[56px]">
          Partir en balade
        </Link>
      </section>
    </main>
  )
}
