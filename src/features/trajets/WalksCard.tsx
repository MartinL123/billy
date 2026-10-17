import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ImportWalkButton } from '../balades/ImportWalkButton'
import { ChevronRightIcon } from '../../components/Icons'
import { cellsLabel, knownFog } from '../../lib/fog'
import { useData } from '../../firebase/store'
import { formatMonthYear } from '../../lib/dates'
import { walksOfMonth } from '../../lib/route'
import { useToday } from '../../lib/useToday'

/** « Ses balades » (trajets.md § 4) : où il a peur, où ça se passe bien. Pas de chiffre à battre, pas de kilomètres. */
export function WalksCard() {
  const { dog, entries, fog } = useData()
  const cells = useMemo(() => knownFog(fog).size, [fog])
  const today = useToday()
  const routes = useMemo(() => walksOfMonth(entries, today.slice(0, 7)), [entries, today])
  const month = formatMonthYear(today).split(' ')[0]!.toLocaleLowerCase('fr')

  return (
    <section aria-label="Ses balades" className="flex flex-col gap-3 rounded-[22px] bg-surface px-4 py-3.5 shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-extrabold">Ses balades</h2>
        <p className="text-sm leading-snug text-[#3F4946]">
          {routes.length ? `${routes.length} balade${routes.length > 1 ? 's' : ''} en ${month}.` : `Importez vos balades Strava pour lever le brouillard sur le territoire de ${dog.name}.`}
        </p>
      </div>
      {routes.length === 0 && <ImportWalkButton className="" />}
      <Link to="/territoire" className="flex min-h-12 items-center justify-between rounded-[16px] bg-primary-soft px-4 text-[17px] font-bold text-primary-dark no-underline">
        <span>Voir sur la carte · {cellsLabel(cells)}</span>
        <ChevronRightIcon size={20} />
      </Link>
    </section>
  )
}
