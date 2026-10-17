import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ImportWalkButton } from '../balades/ImportWalkButton'
import { ChevronRightIcon } from '../../components/Icons'
import { knownCells, zonesLabel } from '../../lib/exploration'
import { useData } from '../../firebase/store'
import { formatMonthYear } from '../../lib/dates'
import { GOOD_COLOR, HARD_COLOR, walksOfMonth } from '../../lib/route'
import { useToday } from '../../lib/useToday'

const WalksMap = lazy(() => import('./WalksMap').then((m) => ({ default: m.WalksMap })))

/** « Ses balades » (trajets.md § 4) : où il a peur, où ça se passe bien. Pas de chiffre à battre, pas de kilomètres. */
export function WalksCard() {
  const { dog, entries, exploration } = useData()
  const cells = useMemo(() => knownCells(exploration).size, [exploration])
  const today = useToday()
  const routes = useMemo(() => walksOfMonth(entries, today.slice(0, 7)), [entries, today])
  const month = formatMonthYear(today).split(' ')[0]!.toLocaleLowerCase('fr')

  return (
    <section aria-label="Ses balades" className="flex flex-col gap-3 rounded-[22px] bg-surface px-4 py-3.5 shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-extrabold">Ses balades</h2>
        <p className="text-sm leading-snug text-[#3F4946]">
          {routes.length ? `Ses trajets en ${month}, superposés.` : `Importez vos balades Strava : vous verrez ici où ${dog.name} a peur et où tout va bien.`}
        </p>
      </div>
      {routes.length > 0 ? (
        <>
          <div className="h-[220px] overflow-hidden rounded-[16px] bg-placeholder">
            <Suspense fallback={null}>
              <WalksMap routes={routes} />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#3F4946]">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: HARD_COLOR }} />
              Peurs et grognes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: GOOD_COLOR }} />
              Ce qui s'est bien passé
            </span>
          </div>
        </>
      ) : (
        <ImportWalkButton className="" />
      )}
      <Link to="/exploration" className="flex min-h-12 items-center justify-between rounded-[16px] bg-primary-soft px-4 text-[17px] font-bold text-primary-dark no-underline">
        <span>Exploration · {zonesLabel(cells)}</span>
        <ChevronRightIcon size={20} />
      </Link>
    </section>
  )
}
