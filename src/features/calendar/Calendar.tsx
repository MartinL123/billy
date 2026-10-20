import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { formatLong, parseISO, toISO, type ISODate } from '../../lib/dates'
import { lateLabel, typeInfo } from '../../lib/events'
import { canMarkDone, healthStatus, lateCare, nextThing, whenLine } from '../../lib/healthScreen'
import { useToast } from '../../components/Toast'
import { AddCareSheet } from './AddCareSheet'
import { careStatus } from '../../lib/health'
import { useToday } from '../../lib/useToday'
import { CalendarEventRow } from './EventRows'
import { MonthGrid } from './MonthGrid'
import { formatKg } from './WeightSheet'

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « En retard de 3 jours », « Prochain le 10 novembre », « Aucun rappel prévu ». */
function careDetail(date: ISODate | '' | undefined, today: ISODate, year: number): string {
  if (!date) return 'Aucun rappel prévu'
  return lateLabel(date, today) || `Prochain le ${formatLong(date).replace(` ${year}`, '')}`
}

/** Santé (V5, T-053, maquettes V5-Sante et V5-Etat-SoinEnRetard) : la phrase d’état, la semaine (dépliable en mois),
 * un soin en retard en tête, la prochaine chose, ce qui vient, les lignes de suivi ; « + Ajouter » fixé en bas. */
export default function Calendar() {
  const { dog, events, weights, documents } = useData()
  const today = useToday()
  const [month, setMonth] = useState(() => toISO({ ...parseISO(today), d: 1 }))
  const [selected, setSelected] = useState<ISODate>(today)
  const [collapsed, setCollapsed] = useState(true)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<string>()
  const toast = useToast()

  const late = lateCare(events, today)[0]
  const next = nextThing(events, today)
  const coming = events
    .filter((e) => !e.done && e.date && e.date >= today && e.id !== next?.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const ofDay = events.filter((e) => e.date === selected)
  const vaccine = careStatus(events, 'vaccin').next
  const worm = careStatus(events, 'vermifuge').next
  const flea = careStatus(events, 'antiparasitaire').next
  const lastWeight = weights[0]
  const year = parseISO(today).y
  const meals = dog.feeding?.meals.length ?? 0

  const lines: { to: string; title: string; detail: string; ok?: boolean; late?: boolean; action?: string }[] = [
    { to: '/sante/evenements?filtre=vaccins', title: 'Vaccins', detail: lateLabel(vaccine?.date ?? '', today) || (vaccine?.date ? `Rappel en ${MONTH_NAMES[parseISO(vaccine.date).m - 1]} ${parseISO(vaccine.date).y}` : 'Aucun rappel prévu'), ok: Boolean(vaccine?.date && vaccine.date >= today), late: Boolean(lateLabel(vaccine?.date ?? '', today)) },
    { to: '/sante/evenements?filtre=soins', title: 'Vermifuge', detail: careDetail(worm?.date, today, year), ok: Boolean(worm?.date && worm.date >= today), late: Boolean(lateLabel(worm?.date ?? '', today)) },
    { to: '/sante/poids', title: 'Poids', detail: lastWeight ? `${formatKg(lastWeight.kg)}\u00a0kg · ${formatLong(lastWeight.date)}` : 'Aucune pesée pour l’instant' },
    // Sans rappel : « Le prévoir » ouvre directement l’ajout.
    flea?.date
      ? { to: '/sante/evenements?filtre=soins', title: 'Antiparasitaire', detail: careDetail(flea.date, today, year), ok: flea.date >= today, late: Boolean(lateLabel(flea.date, today)) }
      : { to: '/evenement/nouveau?type=antiparasitaire', title: 'Antiparasitaire', detail: 'Aucun rappel prévu', action: 'Le prévoir' },
    { to: '/sante/repas', title: 'Repas', detail: dog.feeding && meals ? `${meals} repas · ${dog.feeding.gramsPerDay}\u00a0g par jour` : 'À renseigner' },
    { to: '/sante/documents', title: 'Documents', detail: documents.length ? documents.slice(0, 2).map((d) => d.title).join(', ') : 'Carnet de santé, ordonnances' },
  ]

  return (
    <div className="flex flex-col gap-4 px-5 pb-[88px]">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] leading-tight font-extrabold">Santé</h1>
        <p className="text-[17px] leading-snug text-[#3F4946]">{healthStatus(events, today)}</p>
      </div>

      {/* Un soin en retard passe en tête : seul cas de rouge. */}
      {late && late.date && (
        <section aria-label="Soin en retard" className="card flex flex-col gap-2.5 rounded-[24px] p-4">
          <span className="self-start rounded-full border-2 border-solid border-danger px-2.5 py-0.5 text-[13px] font-extrabold text-danger">À faire</span>
          <Link to={`/evenement/${late.id}`} className="font-display text-[22px] leading-tight font-extrabold text-text no-underline">
            {late.title}
          </Link>
          <p className="text-[16px] text-[#3F4946]">Prévu le {formatLong(late.date)}</p>
          <button type="button" onClick={() => setEventDone(late, true)} className="btn btn-main min-h-[54px]">
            C’est fait
          </button>
          <Link to={`/evenement/${late.id}`} className="btn btn-outline min-h-12">
            Le décaler
          </Link>
        </section>
      )}

      <MonthGrid month={month} today={today} selected={selected} events={events} onMonthChange={setMonth} onSelect={setSelected} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}>
        {/* Le détail du jour touché, en toutes lettres. */}
        <div className="border-0 border-t border-solid border-[#E6EAE7] px-1.5 pt-2.5 pb-1.5">
          {ofDay.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {ofDay.map((event) => (
                <li key={event.id}>
                  <Link to={`/evenement/${event.id}`} className="flex min-h-11 items-center gap-2.5 text-text no-underline">
                    <span className="rounded-full px-2.5 py-0.5 text-[13px] font-extrabold text-white" style={{ background: typeInfo(event.type).color }}>
                      {typeInfo(event.type).label}
                    </span>
                    <span className="text-[15px] font-semibold">{event.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-[#3F4946]">Rien ce jour-là.</p>
          )}
        </div>
      </MonthGrid>

      {next && next.date && (
        <section aria-label="Prochaine chose" className="card flex flex-col gap-2 rounded-[24px] p-4">
          <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">Prochaine chose</span>
          <Link to={`/evenement/${next.id}`} className="font-display text-[22px] leading-tight font-extrabold text-text no-underline">
            {next.title}
          </Link>
          <p className="text-[16px] text-[#3F4946]">{whenLine(next.date, today)}</p>
          {/* « C’est fait » seulement le jour J (ou en retard, voir plus haut). */}
          {canMarkDone(next.date, today) && (
            <button type="button" onClick={() => setEventDone(next, true)} className="btn btn-outline min-h-12">
              C’est fait
            </button>
          )}
        </section>
      )}

      {coming.length > 0 && (
        <section aria-labelledby="a-venir" className="flex flex-col gap-2">
          <h2 id="a-venir" className="font-display text-[20px] font-extrabold">
            À venir
          </h2>
          <div className="card flex flex-col p-0">
            {coming.map((event, i) => (
              <div key={event.id} className={event.id === added ? 'anim-pop' : ''}>
                <CalendarEventRow event={event} today={today} first={i === 0} />
              </div>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Sa santé en détail" className="card flex flex-col p-0">
        {lines.map((line, i) => (
          <Link key={line.title} to={line.to} className={`tap flex min-h-[60px] items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-bold">{line.title}</span>
              <span className={`truncate text-[15px] ${line.late ? 'font-semibold text-danger' : 'text-[#3F4946]'}`}>{line.detail}</span>
            </span>
            {line.ok && <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[13px] font-bold text-primary-dark">À jour</span>}
            {line.action && <span className="shrink-0 rounded-full border-2 border-solid border-primary px-2.5 py-0.5 text-[13px] font-bold text-primary">{line.action}</span>}
            <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
          </Link>
        ))}
      </nav>

      {/* L’action principale, fixée en bas au-dessus de la barre d’onglets. */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+108px)] z-10 mx-auto max-w-[430px] bg-gradient-to-b from-transparent to-bg to-40% px-4 pt-6 pb-3">
        <button type="button" onClick={() => setAdding(true)} className="tap btn btn-main min-h-14 w-full gap-2">
          <PlusIcon size={22} />
          Ajouter un soin ou un RDV
        </button>
      </div>
      {adding && (
        <AddCareSheet
          onClose={() => setAdding(false)}
          onSaved={(id) => {
            setAdded(id)
            toast('C’est noté dans Santé')
          }}
        />
      )}
    </div>
  )
}
