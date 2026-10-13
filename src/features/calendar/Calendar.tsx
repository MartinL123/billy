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
  const lastWeight = weights[0]
  const year = parseISO(today).y

  const newEvent = () => navigate(selected ? `/evenement/nouveau?date=${selected}` : '/evenement/nouveau')

  return (
    <div className="flex flex-col gap-5 px-5">
      <PageHeader title="Calendrier" />

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

      <Fab label="Ajouter un événement" onClick={newEvent} />
      {weightSheet && <WeightSheet today={today} weights={weights} editing={weightSheet.editing} onClose={() => setWeightSheet(null)} />}
    </div>
  )
}
