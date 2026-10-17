import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { setEntryCommune } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { formatDuration } from '../../lib/balade'
import { formatMonthYear, formatShort } from '../../lib/dates'
import { formatRouteDistance } from '../../lib/route'
import { communeName } from '../../lib/street'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { communesOf, filterWalks, walkItems, walksSummary, walkTags, type WalkFilter } from '../../lib/walkList'
import { RouteThumb } from '../trajets/RouteThumb'

const PAGE = 12

/** « Ses balades » (maquette V3-Balades) : toutes les balades, filtres, groupées par mois. */
export default function Walks() {
  const { entries } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const back = useBack('/territoire')
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<WalkFilter>(() => (params.get('filtre') as WalkFilter | null) ?? 'toutes')
  const [all, setAll] = useState(false)
  const walks = useMemo(() => walkItems(entries), [entries])
  const shown = useMemo(() => filterWalks(walks, filter, today), [walks, filter, today])
  const communes = useMemo(() => communesOf(walks), [walks])

  // La commune de chaque balade, demandée une fois (géocodage inverse du départ) puis gardée avec elle.
  useEffect(() => {
    let live = true
    const missing = walks.filter((w) => !w.commune).slice(0, 20)
    void (async () => {
      for (const w of missing) {
        if (!live) return
        const name = await communeName(w.route.points[0]![0], w.route.points[0]![1])
        if (name && live) setEntryCommune(w.id, name)
      }
    })()
    return () => {
      live = false
    }
    // Une seule passe à l'ouverture de l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = all ? shown : shown.slice(0, PAGE)
  const groups = visible.reduce<{ key: string; items: typeof visible }[]>((acc, w) => {
    const key = w.date.slice(0, 7)
    const last = acc[acc.length - 1]
    if (last?.key === key) last.items.push(w)
    else acc.push({ key, items: [w] })
    return acc
  }, [])
  const filters: { id: WalkFilter; label: string }[] = [{ id: 'toutes', label: 'Tout' }, { id: 'mois', label: 'Ce mois' }, ...communes.map((c) => ({ id: `commune:${c}` as WalkFilter, label: c })), { id: 'peur', label: 'Avec une peur' }, { id: 'long', label: 'Plus de 3 km' }]

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          La carte
        </button>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] leading-tight font-extrabold">Ses balades</h1>
          <p className="text-[17px] text-muted">{walksSummary(shown)}</p>
        </div>
        <div role="group" aria-label="Filtrer les balades" className="scroll-row -mx-5 flex gap-2 px-5">
          {filters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`min-h-11 shrink-0 rounded-full border-2 border-solid px-4 text-[15px] font-bold ${filter === f.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {groups.length === 0 && <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[17px] text-[#1D3F73]">Aucune balade pour ce filtre.</p>}
        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold tracking-[0.6px] text-muted uppercase">{formatMonthYear(`${group.key}-01`)}</h2>
            <ul className="card m-0 flex list-none flex-col p-0">
              {group.items.map((w, i) => (
                <li key={w.id} className={i ? 'border-t border-divider' : ''}>
                  <Link to={`/souvenir/${w.id}`} className="flex items-center gap-3 px-3 py-2.5 text-text no-underline">
                    <RouteThumb points={w.route.points} moments={w.route.moments} size={56} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[17px] font-bold">{w.name}</span>
                      <span className="text-[15px] text-muted">{[formatShort(w.date), w.commune, formatRouteDistance(w.route.distanceM), w.route.durationMin ? formatDuration(w.route.durationMin) : ''].filter(Boolean).join(' · ')}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {walkTags(w).map((t) => (
                          <span key={t} className="rounded-full bg-bg px-2 py-0.5 text-[13px] font-semibold text-[#3F4946]">
                            {t}
                          </span>
                        ))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!all && shown.length > PAGE && (
          <button type="button" onClick={() => setAll(true)} className="btn btn-outline">
            Voir les {shown.length - PAGE} balades plus anciennes
          </button>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="button" onClick={() => navigate(`/territoire?filtre=${encodeURIComponent(filter)}`)} className="btn btn-main min-h-[56px] w-full">
            Voir {shown.length > 1 ? `ces ${shown.length} balades` : 'cette balade'} sur la carte
          </button>
        </div>
      </div>
    </div>
  )
}
