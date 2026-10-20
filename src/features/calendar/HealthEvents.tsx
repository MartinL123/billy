import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import { CARE_FILTERS, filterInfo, filterSummary, matchesFilter, upcoming, type CareFilter } from '../../lib/events'
import { useToday } from '../../lib/useToday'
import { CalendarEventRow } from './EventRows'
import { SubScreen } from './SubScreen'
import { useReadOnly } from '../../firebase/viewer'

const DONE_PREVIEW = 3

// Le dernier filtre choisi est retenu sur l’appareil : une préférence d’affichage, pas une donnée.
const FILTER_KEY = 'billy.sante.filtre'
function storedFilter(): CareFilter {
  try {
    return filterInfo(localStorage.getItem(FILTER_KEY) ?? '').id
  } catch {
    return 'tout'
  }
}

/** « Voir tous les événements » : à compléter, à venir (filtres par catégorie), faits. */
export default function HealthEvents() {
  const readOnly = useReadOnly()
  const { events } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [showAllDone, setShowAllDone] = useState(false)
  const [filter, setFilterState] = useState<CareFilter>(() => (params.get('filtre') ? filterInfo(params.get('filtre')!).id : storedFilter()))
  const setFilter = (next: CareFilter) => {
    setFilterState(next)
    setShowAllDone(false)
    try {
      localStorage.setItem(FILTER_KEY, next)
    } catch {
      // Stockage indisponible (navigation privée) : le filtre reste valable pour cette visite.
    }
  }
  const toComplete = events.filter((e) => !e.date && !e.done)
  const allNext = upcoming(events, today)
  const next = allNext.filter((e) => matchesFilter(e, filter))
  const info = filterInfo(filter)
  const done = events.filter((e) => e.done && matchesFilter(e, filter)).sort((a, b) => (b.doneAt ?? b.date).localeCompare(a.doneAt ?? a.date))

  return (
    <SubScreen title="Tous les événements">
      {toComplete.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[1.1176rem] font-bold">À compléter</h2>
          <div className="card overflow-hidden">
            {toComplete.map((event, i) => (
              <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[1.1176rem] font-bold">À venir</h2>
        <div role="group" aria-label="Filtrer par catégorie" className="scroll-row -mx-5 flex gap-2 px-5 pt-0.5 pb-1">
          {CARE_FILTERS.map((item) => {
            const on = filter === item.id
            const count = allNext.filter((e) => matchesFilter(e, item.id)).length
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(item.id)}
                className="flex min-h-12 shrink-0 items-center gap-[7px] rounded-full border-2 border-solid px-3.5 text-[0.8824rem] font-bold"
                style={on ? { background: item.color, borderColor: item.color, color: '#FFFFFF' } : { background: '#FFFFFF', borderColor: '#C9D1CD', color: '#18201E' }}
              >
                {item.id !== 'tout' && <span className="size-2.5 rounded-full" style={{ background: on ? '#FFFFFF' : item.color }} />}
                {item.label}
                <span className="text-[0.7647rem] opacity-80">{count}</span>
              </button>
            )
          })}
        </div>
        {next.length > 0 ? (
          <>
            {filter !== 'tout' && <p className="text-[0.8824rem] font-semibold text-muted">{filterSummary(filter, next.length)}</p>}
            <div className="card overflow-hidden">
              {next.map((event, i) => (
                <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
              ))}
            </div>
          </>
        ) : (
          <div className="card flex flex-col items-start gap-3 p-4">
            <p className="text-[1rem] font-semibold">{info.empty}</p>
            <Link to={info.type ? `/evenement/nouveau?type=${info.type}` : '/evenement/nouveau'} className="btn btn-outline">
              {info.add}
            </Link>
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[1.1176rem] font-bold">Faits</h2>
          <div className="card overflow-hidden">
            {(showAllDone ? done : done.slice(0, DONE_PREVIEW)).map((event, i) => (
              <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
            ))}
            {done.length > DONE_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllDone(!showAllDone)}
                className="btn btn-outline w-full border-t border-divider"
              >
                {showAllDone ? 'Réduire' : `Voir les ${done.length} événements faits`}
              </button>
            )}
          </div>
        </section>
      )}

      {!readOnly && <Fab label="Ajouter un rendez-vous ou un soin" onClick={() => navigate('/evenement/nouveau')} />}
    </SubScreen>
  )
}
