import { Link, useNavigate } from 'react-router-dom'
import { CheckIcon, PaperclipIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useToast } from '../../components/Toast'
import { setEventDone, undoEventDone } from '../../firebase/db'
import type { BillyEvent, WithId } from '../../firebase/types'
import { formatRelative, formatShort, formatTime, formatWeekdayShort, monthAbbr, parseISO, weekdayAbbr, type ISODate } from '../../lib/dates'
import { isOverdue, typeInfo } from '../../lib/events'
import { nextOccurrence, RECURRENCE_LABEL } from '../../lib/recurrence'

type Event = WithId<BillyEvent>

/** Coche « fait » avec confirmation discrète et possibilité d'annuler. */
export function useToggleDone() {
  const toast = useToast()
  return (event: Event) => {
    if (event.done) {
      setEventDone(event, false)
      return
    }
    const nextId = setEventDone(event, true)
    const next = nextId ? nextOccurrence(event.date, event.recurrence) : undefined
    toast(next ? `Fait. Prochain le ${formatShort(next, parseISO(event.date).y)}.` : 'Fait.', {
      label: 'Annuler',
      run: () => undoEventDone(event.id, nextId),
    })
  }
}

function DoneButton({ event, overdue, onToggle }: { event: Event; overdue: boolean; onToggle: (event: Event) => void }) {
  const tone = event.done
    ? 'border-primary bg-primary text-white'
    : overdue
      ? 'border-danger bg-surface text-danger'
      : 'border-[#C9D1CD] bg-surface text-[#8C9692]'
  return (
    <button
      type="button"
      aria-label={event.done ? `Remettre « ${event.title} » à faire` : `Marquer « ${event.title} » comme fait`}
      aria-pressed={event.done}
      onClick={() => onToggle(event)}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 p-0 ${tone}`}
    >
      <CheckIcon size={20} />
    </button>
  )
}

function DocumentLink({ event }: { event: Event }) {
  const navigate = useNavigate()
  const first = event.documentIds?.[0]
  if (!first) return null
  return (
    <button
      type="button"
      aria-label={`Ouvrir le document joint à « ${event.title} »`}
      onClick={() => navigate(`/document/${first}`)}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-primary"
    >
      <PaperclipIcon size={20} />
    </button>
  )
}

/** Ligne de l'écran Aujourd'hui : barre de couleur, date relative, coche. */
export function TodayEventRow({ event, today, first }: { event: Event; today: ISODate; first: boolean }) {
  const toggle = useToggleDone()
  const overdue = isOverdue(event, today)
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${overdue ? 'bg-danger-soft' : ''} ${first ? '' : 'border-t border-divider'}`}>
      <div className="h-10 w-2.5 shrink-0 rounded-full" style={{ background: typeInfo(event.type).color }} />
      <Link to={`/evenement/${event.id}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 text-text no-underline">
        <span className="truncate text-base font-semibold">{event.title}</span>
        {overdue ? (
          <span className="text-sm font-semibold text-danger">En retard · {formatRelative(event.date, today)}</span>
        ) : (
          <span className="text-sm text-muted">
            {formatWeekdayShort(event.date, parseISO(today).y)} · {formatRelative(event.date, today)}
          </span>
        )}
        <Pending show={event.pending} />
      </Link>
      <DocumentLink event={event} />
      <DoneButton event={event} overdue={overdue} onToggle={toggle} />
    </div>
  )
}

/** Ligne du calendrier : bloc date, détail, trombone, coche. */
export function CalendarEventRow({ event, today, first }: { event: Event; today: ISODate; first: boolean }) {
  const toggle = useToggleDone()
  const overdue = isOverdue(event, today)
  const info = typeInfo(event.type)
  const details = [
    overdue ? 'En retard' : '',
    event.time ? formatTime(event.time) : '',
    RECURRENCE_LABEL[event.recurrence],
    !event.time && event.recurrence === 'none' && !overdue ? info.label : '',
  ].filter(Boolean)
  const dateTone = overdue ? 'text-danger' : event.done ? 'text-muted' : ''
  const otherMonth = event.date && event.date.slice(0, 7) !== today.slice(0, 7)

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${overdue ? 'bg-danger-soft' : ''} ${first ? '' : 'border-t border-divider'}`}>
      <Link to={`/evenement/${event.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3.5 text-text no-underline">
        {event.date ? (
          <span className="flex w-11 shrink-0 flex-col text-center">
            <span className={`text-xs font-semibold ${overdue ? 'text-danger' : 'text-muted'}`}>{weekdayAbbr(event.date)}</span>
            <span className={`text-xl font-bold ${dateTone}`}>{parseISO(event.date).d}</span>
            {otherMonth && (
              <span className="text-[11px] text-muted">
                {monthAbbr(event.date)}
                {parseISO(event.date).y !== parseISO(today).y ? ` ${String(parseISO(event.date).y).slice(2)}` : ''}
              </span>
            )}
          </span>
        ) : (
          <span className="flex w-11 shrink-0 justify-center text-xl font-bold text-milestone">?</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`truncate text-base font-semibold ${event.done ? 'text-muted line-through' : ''}`}>{event.title}</span>
          <span className={`flex items-center gap-1.5 text-[13px] ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: info.color }} />
            <span className="truncate">{event.date ? details.join(' · ') : event.done ? 'Date inconnue' : 'Date à compléter'}</span>
          </span>
          <Pending show={event.pending} />
        </span>
      </Link>
      <DocumentLink event={event} />
      {event.date && <DoneButton event={event} overdue={overdue} onToggle={toggle} />}
    </div>
  )
}
