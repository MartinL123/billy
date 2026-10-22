import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CloseIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { readRoute } from '../../lib/route'
import { WalkMap } from './WalkMap'
import { WalkRecap } from './WalkRecap'

/**
 * Le récap d’une balade qui arrive (V6 § 6.3) : `#/balade/recap/:id`. Ouvert depuis le bandeau d’une balade de la Watch
 * (et, avec T-084, depuis sa notification). La carte du tracé en plein écran, le panneau « Belle balade ! » en bas.
 */
export default function WalkArrival() {
  const { id } = useParams()
  const { entries, dog } = useData()
  const navigate = useNavigate()
  const entry = entries.find((e) => e.id === id)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  if (!entry || !route || !id) return <Navigate to="/balades" replace />
  return (
    <main className="fixed inset-0 mx-auto flex max-w-[430px] flex-col bg-bg">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <WalkMap route={route} dogName={dog.name} className="size-full" />
        </div>
        <button type="button" onClick={() => navigate('/', { replace: true })} aria-label="Fermer" className="tap absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 z-10 flex size-11 items-center justify-center rounded-full border-0 bg-surface text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]">
          <CloseIcon size={20} />
        </button>
      </div>
      <WalkRecap entryId={id} overline={route.source === 'watch' ? 'Arrivée de l’Apple Watch' : undefined} fallback={{ distanceM: route.distanceM }} />
    </main>
  )
}
