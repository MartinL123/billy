import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { Pending } from '../../components/Pending'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import type { Weight, WithId } from '../../firebase/types'
import { formatLong, formatShort, parseISO, toISO, type ISODate } from '../../lib/dates'
import { CARE_FILTERS, filterInfo, filterSummary, matchesFilter, upcoming, type CareFilter, type EventType } from '../../lib/events'
import { careStatus } from '../../lib/health'
import { useToday } from '../../lib/useToday'
import { DocumentsSection } from '../profile/DocumentsSection'
import { Meals } from '../today/Meals'
import { CalendarEventRow } from './EventRows'
import { MonthGrid } from './MonthGrid'
import { WeightChart } from './WeightChart'
import { formatKg, WeightSheet } from './WeightSheet'

const DONE_PREVIEW = 3

// Le dernier filtre choisi est retenu sur l'appareil : une préférence d'affichage, pas une donnée.
const FILTER_KEY = 'billy.sante.filtre'
function storedFilter(): CareFilter {
  try {
    return filterInfo(localStorage.getItem(FILTER_KEY) ?? '').id
  } catch {
    return 'tout'
  }
}

const CARE: { type: EventType; label: string }[] = [
  { type: 'vaccin', label: 'Vaccin CHPPiL' },
  { type: 'vermifuge', label: 'Vermifuge' },
  { type: 'antiparasitaire', label: 'Puces et tiques' },
]

export default function Calendar() {
  const { dog, events, weights } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => toISO({ ...parseISO(today), d: 1 }))
  const [selected, setSelected] = useState<ISODate | null>(null)
  const [showAllDone, setShowAllDone] = useState(false)
  const [filter, setFilterState] = useState<CareFilter>(storedFilter)
  const setFilter = (next: CareFilter) => {
    setFilterState(next)
    setShowAllDone(false)
    try {
      localStorage.setItem(FILTER_KEY, next)
    } catch {
      // Stockage indisponible (navigation privée) : le filtre reste valable pour cette visite.
    }
  }
  const [weightSheet, setWeightSheet] = useState<{ editing?: WithId<Weight> } | null>(null)

  const toComplete = events.filter((e) => !e.date && !e.done)
  const allNext = upcoming(events, today)
  const next = allNext.filter((e) => matchesFilter(e, filter))
  const info = filterInfo(filter)
  const done = events.filter((e) => e.done && matchesFilter(e, filter)).sort((a, b) => (b.doneAt ?? b.date).localeCompare(a.doneAt ?? a.date))
  const ofDay = selected ? events.filter((e) => e.date === selected) : []
  const lastWeight = weights[0]
  const year = parseISO(today).y

  const newEvent = () => navigate(selected ? `/evenement/nouveau?date=${selected}` : '/evenement/nouveau')

  return (
    <div className="flex flex-col gap-5 px-5">
      <PageHeader title="Santé" />

      <section aria-label="Soins" className="card px-4 py-1">
        {CARE.map(({ type, label }, i) => {
          const { last, next: due } = careStatus(events, type)
          return (
            <div key={type} className={`flex flex-col gap-0.5 py-3 ${i ? 'border-t border-divider' : ''}`}>
              <span className="text-[13px] text-muted">{label}</span>
              <span className="text-base font-semibold">{last ? (last.date ? `Fait le ${formatLong(last.date)}` : 'Fait, date inconnue') : 'Rien de noté'}</span>
              <span className="text-[13px] text-muted">{due?.date ? `Prochain : ${formatLong(due.date)}` : 'Aucun rappel prévu'}</span>
            </div>
          )
        })}
      </section>

      <MonthGrid
        month={month}
        today={today}
        selected={selected}
        events={events.filter((e) => matchesFilter(e, filter))}
        onMonthChange={setMonth}
        onSelect={(day) => setSelected(day === selected ? null : day)}
      />

      {selected && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Le {formatLong(selected)}</h2>
          {ofDay.length > 0 && (
            <div className="card overflow-hidden">
              {ofDay.map((event, i) => (
                <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
              ))}
            </div>
          )}
          <Link
            to={`/evenement/nouveau?date=${selected}`}
            className="btn btn-outline rounded-field border-dashed border-[#9AA39F]"
          >
            Ajouter un événement ce jour-là
          </Link>
        </section>
      )}

      {toComplete.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">À compléter</h2>
          <div className="card overflow-hidden">
            {toComplete.map((event, i) => (
              <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">À venir</h2>
        <div role="group" aria-label="Filtrer par catégorie" className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-0.5 pb-1">
          {CARE_FILTERS.map((item) => {
            const on = filter === item.id
            const count = allNext.filter((e) => matchesFilter(e, item.id)).length
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(item.id)}
                className="flex min-h-12 shrink-0 items-center gap-[7px] rounded-full border-2 border-solid px-3.5 text-[15px] font-bold"
                style={on ? { background: item.color, borderColor: item.color, color: '#FFFFFF' } : { background: '#FFFFFF', borderColor: '#C9D1CD', color: '#18201E' }}
              >
                {item.id !== 'tout' && <span className="size-2.5 rounded-full" style={{ background: on ? '#FFFFFF' : item.color }} />}
                {item.label}
                <span className="text-[13px] opacity-80">{count}</span>
              </button>
            )
          })}
        </div>
        {next.length > 0 ? (
          <>
            {filter !== 'tout' && <p className="text-[15px] font-semibold text-muted">{filterSummary(filter, next.length)}</p>}
            <div className="card overflow-hidden">
              {next.map((event, i) => (
                <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
              ))}
            </div>
          </>
        ) : (
          <div className="card flex flex-col items-start gap-3 p-4">
            <p className="text-[17px] font-semibold">{info.empty}</p>
            <Link to={info.type ? `/evenement/nouveau?type=${info.type}` : '/evenement/nouveau'} className="btn btn-outline">
              {info.add}
            </Link>
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">Faits</h2>
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

      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[19px] font-bold">Poids</h2>
            <div className="text-[13px] text-muted">{lastWeight ? `Pesé le ${formatShort(lastWeight.date, year)}` : 'Aucune pesée pour l’instant'}</div>
          </div>
          {lastWeight && (
            <div className="font-display text-[30px] font-bold">
              {formatKg(lastWeight.kg)} <span className="font-sans text-base font-semibold text-muted">kg</span>
            </div>
          )}
        </div>
        {lastWeight && <Pending show={lastWeight.pending} />}
        <WeightChart weights={weights} />
        {weights.length > 0 && (
          <div className="flex flex-col">
            {weights.slice(0, 5).map((weight) => (
              <button
                key={weight.id}
                type="button"
                aria-label={`Modifier la pesée du ${formatLong(weight.date)}`}
                onClick={() => setWeightSheet({ editing: weight })}
                className="flex min-h-12 items-center gap-3 border-0 border-t border-solid border-divider bg-transparent px-0 text-left text-[17px] text-text"
              >
                <span className="flex-1">{formatShort(weight.date, year)}</span>
                <span className="font-semibold">{formatKg(weight.kg)} kg</span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setWeightSheet({})} className={outlineButton}>
          Ajouter une pesée
        </button>
      </section>

      {dog.feeding && dog.feeding.meals.length > 0 && <Meals dogName={dog.name} feeding={dog.feeding} today={today} />}

      <DocumentsSection />

      <Fab label="Ajouter un rendez-vous ou un soin" onClick={newEvent} />
      {weightSheet && <WeightSheet today={today} weights={weights} editing={weightSheet.editing} onClose={() => setWeightSheet(null)} />}
    </div>
  )
}
