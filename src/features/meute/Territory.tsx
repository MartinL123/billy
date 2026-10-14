import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { watchMarks, watchSpots, type Mark, type Spot, type WithId } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { dogColor } from '../../lib/community'
import { spotsCount, territoryLine, territoryOf } from '../../lib/territory'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'

const TerritoryMap = lazy(() => import('./TerritoryMap').then((m) => ({ default: m.TerritoryMap })))

/** Le territoire de Billy (maquette V3-Territoire) : les spots où il a laissé sa trace, pour toujours. */
export default function Territory() {
  const { dog } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const me = auth.currentUser?.uid ?? ''
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [marks, setMarks] = useState<WithId<Mark>[]>([])
  useEffect(() => {
    const stops = [watchSpots(setSpots), watchMarks(setMarks)]
    return () => stops.forEach((stop) => stop())
  }, [])
  const territory = useMemo(() => territoryOf(me, marks, spots, today), [me, marks, spots, today])
  const mapSpots = useMemo(() => territory.spots.map((t) => t.spot), [territory])
  const chips = [spotsCount(territory.spots.length), territory.newThisMonth ? `${territory.newThisMonth} nouveau${territory.newThisMonth > 1 ? 'x' : ''} ce mois` : '', territory.shared ? `${territory.shared.count} en commun avec ${territory.shared.dogName}` : ''].filter(Boolean)

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          L'arbre de {dog.name}
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-extrabold">Le territoire de {dog.name}</h1>
          <p className="text-[17px] text-muted">Les spots où il a laissé sa trace.</p>
        </div>
        {territory.spots.length > 0 ? (
          <>
            <div className="h-[240px] overflow-hidden rounded-[20px] bg-placeholder">
              <Suspense fallback={null}>
                <TerritoryMap spots={mapSpots} color={dogColor(me)} />
              </Suspense>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip} className="flex min-h-9 items-center rounded-full bg-primary-soft px-3 text-[15px] font-bold text-primary-dark">
                  {chip}
                </span>
              ))}
            </div>
            <ul className="card m-0 flex list-none flex-col p-0">
              {territory.spots.map((t, i) => (
                <li key={t.spot.id} className={`flex flex-col gap-0.5 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
                  <span className="text-[17px] font-bold">{t.spot.name}</span>
                  <span className="text-[15px] text-muted">{territoryLine(t, today)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[17px] leading-snug text-[#1D3F73]">{dog.name} n'a encore marqué aucun spot. Touchez « Marquer » dans la Meute pendant votre balade.</p>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <Link to="/meute" className="btn btn-main min-h-[56px] w-full">
            Trouver un nouveau spot
          </Link>
        </div>
      </div>
    </div>
  )
}
