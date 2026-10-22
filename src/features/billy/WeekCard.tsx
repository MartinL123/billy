import { useNavigate } from 'react-router-dom'
import { formatDayHeading } from '../../lib/dates'
import { weekSummary, type TrainingWeek, type WeekDay } from '../../lib/billyPage'

function Moon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** Le rond d’un jour : coche, lune, aujourd’hui (contour orange) ou pointillés. Jamais de rouge. */
function Dot({ day }: { day: WeekDay }) {
  const ring = day.today ? 'shadow-[inset_0_0_0_2px_var(--color-action)]' : ''
  if (day.state === 'fait')
    return <span className={`flex size-[34px] items-center justify-center rounded-full bg-primary text-white ${day.today ? 'outline-2 outline-offset-2 outline-action outline-solid' : ''}`}><Check /></span>
  if (day.state === 'repos') return <span className={`flex size-[34px] items-center justify-center rounded-full bg-divider text-muted ${ring}`}><Moon /></span>
  if (day.today) return <span className={`flex size-[34px] items-center justify-center rounded-full bg-milestone-soft text-action ${ring}`}><span className="size-1 rounded-full bg-current" /></span>
  return <span className="block size-[34px] rounded-full border-2 border-dashed border-border" />
}

const dayLabel = (day: WeekDay) => {
  const what = day.state === 'fait' ? `${day.sessionIds.length} séance${day.sessionIds.length > 1 ? 's' : ''}` : day.state === 'repos' ? 'repos' : day.upcoming ? 'à venir' : 'rien de noté'
  return `${formatDayHeading(day.date)}${day.today ? ', aujourd’hui' : ''} : ${what}`
}

/** « Sa semaine » : 7 ronds du lundi au dimanche ; toucher un jour coché ouvre sa séance (ou la liste du jour). */
export function WeekCard({ week, back }: { week: TrainingWeek; /** Libellé du retour sur la séance ouverte (« Billy »). */ back: string }) {
  const navigate = useNavigate()
  const open = (day: WeekDay) => navigate(day.sessionIds.length === 1 ? `/souvenir/${day.sessionIds[0]}` : `/billy/jour/${day.date}`, { state: { retour: back } })
  return (
    <section aria-labelledby="semaine" className="card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="semaine" className="title-card m-0 text-[1rem]">
          Sa semaine
        </h2>
        <span className="text-[0.7647rem] whitespace-nowrap text-muted">{weekSummary(week)}</span>
      </div>
      <ol className="m-0 mt-1 grid list-none grid-cols-7 p-0">
        {week.days.map((day) => {
          const content = (
            <>
              <span aria-hidden="true" className="text-[0.7059rem] leading-none text-muted">
                {day.letter}
              </span>
              <Dot day={day} />
            </>
          )
          return (
            <li key={day.date} className="flex justify-center">
              {day.state === 'fait' ? (
                <button type="button" onClick={() => open(day)} aria-label={dayLabel(day)} className="tap flex min-h-11 w-full flex-col items-center gap-1 border-0 bg-transparent px-0 pt-1.5 pb-0.5">
                  {content}
                </button>
              ) : (
                <span role="img" aria-label={dayLabel(day)} className="flex w-full flex-col items-center gap-1 pt-1.5 pb-0.5">
                  {content}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
