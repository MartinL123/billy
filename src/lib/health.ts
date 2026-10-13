import type { ISODate } from './dates'
import type { EventType } from './events'

interface CareEvent {
  type: EventType
  date: ISODate | ''
  done: boolean
}

export interface CareStatus<T> {
  /** Dernier soin fait (le plus récent daté ; à défaut un soin fait sans date). */
  last?: T
  /** Prochain soin prévu, pas encore fait. */
  next?: T
}

/** Dernier soin fait et prochain soin prévu pour un type d'événement. */
export function careStatus<T extends CareEvent>(events: T[], type: EventType): CareStatus<T> {
  const own = events.filter((e) => e.type === type)
  const done = own.filter((e) => e.done)
  const last = done.filter((e) => e.date).sort((a, b) => b.date.localeCompare(a.date))[0] ?? done[0]
  const next = own.filter((e) => !e.done && e.date).sort((a, b) => a.date.localeCompare(b.date))[0]
  return { last, next }
}
