import { lazy, Suspense, useMemo } from 'react'
import { ChevronLeftIcon } from '../../components/Icons'
import { useData } from '../../firebase/store'
import { BONES_PER_ZONE, knownCells, MAX_ZONE_BONES, zonesLabel } from '../../lib/exploration'
import { useBack } from '../../lib/useBack'
import { ImportWalkButton } from './ImportWalkButton'

const FogMap = lazy(() => import('./FogMap').then((m) => ({ default: m.FogMap })))

/** L'exploration : le brouillard se lève là où vous êtes passés. On compte des zones, jamais des kilomètres. */
export default function Exploration() {
  const { dog, exploration } = useData()
  const back = useBack('/billy')
  const cells = useMemo(() => knownCells(exploration), [exploration])

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          Retour
        </button>
      </header>
      <div className="flex flex-col gap-1 px-5 pb-3">
        <h1 className="font-display text-[28px] leading-tight font-extrabold">L'exploration de {dog.name}</h1>
        <p className="text-[17px] font-bold text-primary">{zonesLabel(cells.size)}</p>
      </div>
      <div className="relative min-h-[360px] flex-1 overflow-hidden bg-placeholder">
        <Suspense fallback={null}>
          <FogMap cells={cells} />
        </Suspense>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-divider bg-bg px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <p className="text-[15px] leading-snug text-muted">
          {cells.size ? `Chaque nouvelle zone rapporte ${BONES_PER_ZONE} os (${MAX_ZONE_BONES} au plus par balade). Prenez une autre rue la prochaine fois !` : 'Importez vos balades Strava : le brouillard se lèvera là où vous êtes passés.'}
        </p>
        <ImportWalkButton main className="" />
      </div>
    </div>
  )
}
