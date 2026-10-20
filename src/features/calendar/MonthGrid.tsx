import type { ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { weekOf } from '../../lib/healthScreen'
import type { BillyEvent, WithId } from '../../firebase/types'
import { addDays, addMonths, dayNumber, daysInMonth, formatLong, formatMonthYear, parseISO, type ISODate } from '../../lib/dates'
import { typeInfo } from '../../lib/events'

interface MonthGridProps {
  /** Premier jour du mois affiché. */
  month: ISODate
  today: ISODate
  selected: ISODate | null
  events: WithId<BillyEvent>[]
  onMonthChange: (month: ISODate) => void
  onSelect: (day: ISODate) => void
  /** Replié sur la semaine en cours (V5, T-053) ; la pilule « Voir le mois » / « Voir la semaine » le déplie. */
  collapsed?: boolean
  onToggle?: () => void
  /** Sous la grille : le détail du jour touché. */
  children?: ReactNode
}

/** Semaines complètes (lundi → dimanche) couvrant le mois. */
function gridDays(month: ISODate): ISODate[] {
  const { y, m } = parseISO(month)
  // 1970-01-01 était un jeudi : (n + 3) % 7 donne 0 pour lundi.
  const offset = (((dayNumber(month) + 3) % 7) + 7) % 7
  const cells = Math.ceil((offset + daysInMonth(y, m)) / 7) * 7
  return Array.from({ length: cells }, (_, i) => addDays(month, i - offset))
}

export function MonthGrid({ month, today, selected, events, onMonthChange, onSelect, collapsed = false, onToggle, children }: MonthGridProps) {
  const colorsByDay = new Map<ISODate, string[]>()
  for (const event of events) {
    if (!event.date) continue
    const colors = colorsByDay.get(event.date) ?? []
    const color = typeInfo(event.type).color
    if (!colors.includes(color)) colors.push(color)
    colorsByDay.set(event.date, colors)
  }

  const navButton = 'flex size-12 items-center justify-center rounded-full border-0 bg-transparent p-0 text-text'

  return (
    <section aria-label="Vue du mois" className="card flex flex-col gap-1.5 rounded-3xl px-3 pt-3 pb-2">
      <div className="flex items-center justify-between gap-2">
        {!collapsed && (
          <button type="button" aria-label="Mois précédent" onClick={() => onMonthChange(addMonths(month, -1))} className={navButton}>
            <ChevronLeftIcon />
          </button>
        )}
        <div className={`text-[1rem] font-bold ${collapsed ? 'pl-1.5' : ''}`} aria-live="polite">
          {formatMonthYear(collapsed ? (selected ?? today) : month).replace(/^./, (c) => c.toLocaleUpperCase('fr'))}
        </div>
        {!collapsed && (
          <button type="button" aria-label="Mois suivant" onClick={() => onMonthChange(addMonths(month, 1))} className={navButton}>
            <ChevronRightIcon />
          </button>
        )}
        {onToggle && (
          <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="tap min-h-11 rounded-full border-0 bg-primary-soft px-3.5 text-[0.8824rem] font-bold text-primary-dark">
            {collapsed ? 'Voir le mois' : 'Voir la semaine'}
          </button>
        )}
      </div>
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-xs font-semibold text-muted">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {(collapsed ? weekOf(selected ?? today) : gridDays(month)).map((day) => {
          const inMonth = day.slice(0, 7) === month.slice(0, 7)
          const isToday = day === today
          const isSelected = day === selected
          const colors = colorsByDay.get(day) ?? []
          const count = colors.length
          return (
            <button
              key={day}
              type="button"
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={`${formatLong(day)}${count ? `, ${count} événement${count > 1 ? 's' : ''}` : ''}`}
              onClick={() => onSelect(day)}
              className="flex h-12 flex-col items-center gap-px border-0 bg-transparent p-0 text-[0.8824rem]"
            >
              <span
                className={`flex size-[34px] items-center justify-center rounded-full ${
                  // V5 : le jour touché en vert plein, aujourd’hui en vert clair.
                  isSelected
                    ? 'bg-primary font-bold text-white'
                    : isToday
                      ? 'bg-primary-soft font-bold text-primary-dark'
                      : inMonth || collapsed
                        ? 'text-text'
                        : 'font-normal text-muted'
                }`}
              >
                {parseISO(day).d}
              </span>
              <span className="flex h-1.5 gap-[3px]">
                {colors.slice(0, 3).map((color) => (
                  <span key={color} className="size-1.5 rounded-full" style={{ background: color }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      {children}
    </section>
  )
}
