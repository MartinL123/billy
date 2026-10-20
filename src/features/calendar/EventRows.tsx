import { canMarkDone } from '../../lib/healthScreen'
import { Link, useNavigate } from 'react-router-dom'
import { CheckIcon, ChevronRightIcon, PaperclipIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useToast } from '../../components/Toast'
import { setEventDone, undoEventDone } from '../../firebase/db'
import type { BillyEvent, WithId } from '../../firebase/types'
import { formatShort, formatTime, monthAbbr, parseISO, todayISO, weekdayAbbr, type ISODate } from '../../lib/dates'
import { isOverdue, typeInfo } from '../../lib/events'
import { doneDate } from '../../lib/health'
import { nextAfterDone, RECURRENCE_LABEL } from '../../lib/recurrence'
import { useReadOnly } from '../../firebase/viewer'

type Event = WithId<BillyEvent>

/** Coche « fait » avec confirmation discrète et possibilité d’annuler. */
export function useToggleDone() {
  const toast = useToast()
  return (event: Event) => {
    if (event.done) {
      setEventDone(event, false)
      return
    }
    const nextId = setEventDone(event, true)
    const next = nextId ? nextAfterDone(event.date, event.recurrence, todayISO()) : undefined
    toast(next ? `Fait. Prochain le ${formatShort(next, parseISO(todayISO()).y)}.` : 'Fait.', {
      label: 'Annuler',
      run: () => undoEventDone(event.id, nextId),
    })
  }
}

function DoneButton({ event, onToggle }: { event: Event; onToggle: (event: Event) => void }) {
  return (
    <button
      type="button"
      aria-label={event.done ? `Remettre « ${event.title} » à faire` : `Marquer « ${event.title} » comme fait`}
      aria-pressed={event.done}
      onClick={() => onToggle(event)}
      className={`btn min-h-12 px-4 ${event.done ? 'btn-on' : 'btn-outline'}`}
    >
      <CheckIcon size={20} />
      {event.done ? 'Fait' : 'Marquer fait'}
    </button>
  )
}

function DocumentLink({ event }: { event: Event }) {
  const navigate = useNavigate()
  const first = event.documentIds?.[0]
  if (!first) return null
  return (
    <button type="button" aria-label={`Ouvrir le document joint à « ${event.title} »`} onClick={() => navigate(`/document/${first}`)} className="btn btn-outline min-h-12 px-4">
      <PaperclipIcon size={20} />
      Document
    </button>
  )
}

/** Ligne du calendrier : bloc date, détail, trombone, coche. */
export function CalendarEventRow({ event, today, first }: { event: Event; today: ISODate; first: boolean }) {
  const toggle = useToggleDone()
  const readOnly = useReadOnly()
  const overdue = isOverdue(event, today)
  const info = typeInfo(event.type)
  // Un rendez-vous avec une heure l’affiche en premier, sous son titre : « 10 h 30 · … ».
  const details = [
    event.time ? formatTime(event.time) : '',
    overdue ? 'En retard' : '',
    RECURRENCE_LABEL[event.recurrence],
    !event.time && event.recurrence === 'none' && !overdue ? info.label : '',
  ].filter(Boolean)
  const dateTone = overdue ? 'text-danger' : event.done ? 'text-muted' : ''
  // Un soin fait s’affiche au jour où il a vraiment été fait (audit R-001).
  const shown = event.done ? doneDate(event) : event.date
  const otherMonth = shown && shown.slice(0, 7) !== today.slice(0, 7)
  // V5 : on ne coche pas un soin de janvier en octobre ; la coche apparaît le jour J (ou en retard).
  // Visiteur (T-048) : il voit les soins, sans les cocher.
  const markable = !readOnly && Boolean(event.date) && (event.done || canMarkDone(event.date, today))

  return (
    <div className={`flex flex-col gap-2.5 px-4 py-3.5 ${overdue ? 'bg-danger-soft' : ''} ${first ? '' : 'border-t border-divider'}`}>
      <Link to={`/evenement/${event.id}`} className="flex min-h-12 min-w-0 items-center gap-3.5 text-text no-underline">
        {shown ? (
          <span className="flex w-[52px] shrink-0 flex-col items-center text-center leading-[1.15] whitespace-nowrap">
            <span className={`text-xs font-semibold ${overdue ? 'text-danger' : 'text-muted'}`}>{weekdayAbbr(shown)}</span>
            <span className={`text-xl font-bold ${dateTone}`}>{parseISO(shown).d}</span>
            {otherMonth && (
              <span className="text-xs text-muted">
                {monthAbbr(shown)}
                {parseISO(shown).y !== parseISO(today).y ? ` ${String(parseISO(shown).y).slice(2)}` : ''}
              </span>
            )}
          </span>
        ) : (
          <span className="flex w-[52px] shrink-0 justify-center text-xl font-bold text-milestone">?</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`truncate text-base font-semibold ${event.done ? 'text-muted line-through' : ''}`}>{event.title}</span>
          <span className={`flex items-center gap-1.5 text-[13px] ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: info.color }} />
            <span className="truncate">{event.date ? details.join(' · ') : event.done ? 'Date inconnue' : 'Date à compléter'}</span>
          </span>
          <Pending show={event.pending} />
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>
      {(markable || Boolean(event.documentIds?.length)) && (
        <div className="flex flex-wrap gap-2">
          {markable && <DoneButton event={event} onToggle={toggle} />}
          <DocumentLink event={event} />
        </div>
      )}
    </div>
  )
}
