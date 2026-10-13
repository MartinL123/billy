import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { Pending } from '../../components/Pending'
import { Fab } from '../../components/TabBar'
import { useData } from '../../firebase/store'
import type { Weight, WithId } from '../../firebase/types'
import { formatLong, formatShort, parseISO, toISO, type ISODate } from '../../lib/dates'
import { upcoming } from '../../lib/events'
import { useToday } from '../../lib/useToday'
import { CalendarEventRow } from './EventRows'
import { MonthGrid } from './MonthGrid'
import { WeightChart } from './WeightChart'
import { formatKg, WeightSheet } from './WeightSheet'

const DONE_PREVIEW = 3

export default function Calendar() {
  const { events, weights } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => toISO({ ...parseISO(today), d: 1 }))
  const [selected, setSelected] = useState<ISODate | null>(null)
  const [showAllDone, setShowAllDone] = useState(false)
  const [weightSheet, setWeightSheet] = useState<{ editing?: WithId<Weight> } | null>(null)

  const toComplete = events.filter((e) => !e.date && !e.done)
  const next = upcoming(events, today)
  const done = events.filter((e) => e.done).sort((a, b) => (b.doneAt ?? b.date).localeCompare(a.doneAt ?? a.date))
  const ofDay = selected ? events.filter((e) => e.date === selected) : []
  const [lastWeight, ...olderWeights] = weights
  const year = parseISO(today).y

  const newEvent = () => navigate(selected ? `/evenement/nouveau?date=${selected}` : '/evenement/nouveau')

  return (
    <div className="flex flex-col gap-5 px-5">
      <h1 className="font-display text-[32px] font-bold tracking-[-0.5px]">Calendrier</h1>

      <MonthGrid
        month={month}
        today={today}
        selected={selected}
        events={events}
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
            className="flex h-[52px] items-center justify-center rounded-field border-[1.5px] border-dashed border-[#9AA39F] text-[15px] font-semibold text-primary no-underline"
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
        {next.length > 0 ? (
          <div className="card overflow-hidden">
            {next.map((event, i) => (
              <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-[15px] text-muted">Rien de prévu pour l'instant.</p>
            <Link to="/evenement/nouveau" className={outlineButton}>
              Ajouter un événement
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
                className="h-12 w-full border-0 border-t border-solid border-divider bg-transparent text-[15px] font-semibold text-primary"
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
            <button
              type="button"
              aria-label={`Modifier la pesée du ${formatLong(lastWeight.date)}, ${formatKg(lastWeight.kg)} kilos`}
              onClick={() => setWeightSheet({ editing: lastWeight })}
              className="min-h-11 border-0 bg-transparent p-0 text-right font-display text-[30px] font-bold text-text"
            >
              {formatKg(lastWeight.kg)} <span className="font-sans text-base font-semibold text-muted">kg</span>
            </button>
          )}
        </div>
        {lastWeight && <Pending show={lastWeight.pending} />}
        <WeightChart weights={weights} />
        {olderWeights.length > 0 && (
          <div className="flex flex-col text-sm text-muted">
            {olderWeights.slice(0, 4).map((weight) => (
              <button
                key={weight.id}
                type="button"
                aria-label={`Modifier la pesée du ${formatLong(weight.date)}`}
                onClick={() => setWeightSheet({ editing: weight })}
                className="flex min-h-11 items-center justify-between border-0 border-t border-solid border-divider bg-transparent px-0 text-sm text-muted"
              >
                <span>{formatShort(weight.date, year)}</span>
                <span>{formatKg(weight.kg)} kg</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setWeightSheet({})} className={outlineButton}>
          Ajouter une pesée
        </button>
      </section>

      <Fab label="Ajouter un événement" onClick={newEvent} />
      {weightSheet && <WeightSheet today={today} weights={weights} editing={weightSheet.editing} onClose={() => setWeightSheet(null)} />}
    </div>
  )
}
