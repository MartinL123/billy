import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { diffDays, formatDayHeading, formatLong, formatShort, parseISO, toISO, type ISODate } from '../../lib/dates'
import { healthLine, upcoming } from '../../lib/events'
import { careStatus } from '../../lib/health'
import { useToday } from '../../lib/useToday'
import { CalendarEventRow } from './EventRows'
import { MonthGrid } from './MonthGrid'
import { formatKg } from './WeightSheet'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « Dans 8 jours », « Aujourd'hui », « En retard de 3 jours » */
function inDays(date: ISODate, today: ISODate): string {
  const days = diffDays(today, date)
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'demain'
  if (days > 0) return `dans ${days} jours`
  return `en retard de ${-days} jour${days < -1 ? 's' : ''}`
}

/** Santé (spec V4 § 5) : le calendrier tout de suite, la prochaine chose à faire, 5 lignes vers les détails. */
export default function Calendar() {
  const { dog, events, weights, documents } = useData()
  const today = useToday()
  const [month, setMonth] = useState(() => toISO({ ...parseISO(today), d: 1 }))
  const [selected, setSelected] = useState<ISODate | null>(null)

  const next = upcoming(events, today)[0]
  const ofDay = selected ? events.filter((e) => e.date === selected) : []
  const vaccine = careStatus(events, 'vaccin').next
  const worm = careStatus(events, 'vermifuge').next
  const lastWeight = weights[0]
  const year = parseISO(today).y
  const meals = dog.feeding?.meals.length ?? 0

  const lines: { to: string; title: string; detail: string; ok?: boolean }[] = [
    { to: '/sante/evenements?filtre=vaccins', title: 'Vaccins', detail: vaccine?.date ? `Prochain rappel en ${MONTH_NAMES[parseISO(vaccine.date).m - 1]} ${parseISO(vaccine.date).y}` : 'Aucun rappel prévu', ok: Boolean(vaccine?.date && vaccine.date >= today) },
    { to: '/sante/evenements?filtre=soins', title: 'Vermifuge', detail: worm?.date ? `Prochain le ${formatLong(worm.date).replace(` ${year}`, '')}` : 'Aucun rappel prévu', ok: Boolean(worm?.date && worm.date >= today) },
    { to: '/sante/poids', title: 'Poids', detail: lastWeight ? `${formatKg(lastWeight.kg)} kg · pesé le ${formatShort(lastWeight.date, year)}` : 'Aucune pesée pour l’instant' },
    { to: '/sante/repas', title: 'Repas', detail: dog.feeding && meals ? `${meals} repas · ${dog.feeding.gramsPerDay} g par jour` : 'À renseigner' },
    { to: '/sante/documents', title: 'Documents', detail: documents.length ? documents.slice(0, 2).map((d) => d.title).join(', ') : 'Carnet de santé, ordonnances' },
  ]

  return (
    <div className="flex flex-col gap-4 px-5">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-muted">{formatDayHeading(today)}</p>
        <h1 className="font-display text-[32px] leading-tight font-bold">Santé</h1>
        <p className="text-[17px] leading-snug text-[#3F4946]">{healthLine(events, today)}</p>
      </div>

      <MonthGrid month={month} today={today} selected={selected} events={events} onMonthChange={setMonth} onSelect={(day) => setSelected(day === selected ? null : day)} />

      {selected && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[17px] font-bold">Le {formatLong(selected)}</h2>
          {ofDay.length > 0 ? (
            <div className="card overflow-hidden">
              {ofDay.map((event, i) => (
                <CalendarEventRow key={event.id} event={event} today={today} first={i === 0} />
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">Rien ce jour-là.</p>
          )}
          <Link to={`/evenement/nouveau?date=${selected}`} className="btn btn-outline">
            Ajouter un événement ce jour-là
          </Link>
        </section>
      )}

      {next && next.date ? (
        <section aria-label="Prochaine chose à faire" className="card flex flex-col gap-2.5 rounded-[24px] p-4">
          <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">Prochaine chose à faire</span>
          <Link to={`/evenement/${next.id}`} className="font-display text-[22px] leading-tight font-extrabold text-text no-underline">
            {next.title}
          </Link>
          <p className="text-[17px] text-[#3F4946]">
            {formatDayHeading(next.date)} · {inDays(next.date, today)}
          </p>
          <button type="button" onClick={() => setEventDone(next, true)} className="btn btn-main min-h-[54px]">
            C’est fait
          </button>
          <p className="text-[15px] text-muted">{dog.name} vous le rappellera le jour même.</p>
        </section>
      ) : (
        <section className="card flex flex-col items-start gap-3 p-4">
          <p className="text-[17px] font-semibold">Rien de prévu pour l’instant.</p>
          <Link to="/evenement/nouveau" className="btn btn-main">
            Ajouter un rendez-vous ou un soin
          </Link>
        </section>
      )}

      <nav aria-label="Sa santé en détail" className="card flex flex-col p-0">
        {lines.map((line, i) => (
          <Link key={line.title} to={line.to} className={`flex min-h-[60px] items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-bold">{line.title}</span>
              <span className="truncate text-[15px] text-muted">{line.detail}</span>
            </span>
            {line.ok && <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-bold text-primary-dark">À jour</span>}
            <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
          </Link>
        ))}
      </nav>

      <Link to="/sante/evenements" className="flex min-h-12 items-center justify-center text-[17px] font-bold text-primary no-underline">
        Voir tous les événements
      </Link>
    </div>
  )
}
