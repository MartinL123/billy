import type { ISODate } from './dates'
import type { EventType } from './events'

interface CareEvent {
  type: EventType
  date: ISODate | ''
  done: boolean
  /** Jour réel de la validation (peut différer de la date prévue). */
  doneAt?: ISODate
}

/** Le jour où un soin a vraiment été fait : la validation si on la connaît, sinon la date prévue. */
export const doneDate = (e: { date: ISODate | ''; doneAt?: ISODate }): ISODate | '' => e.doneAt ?? e.date

export interface CareStatus<T> {
  /** Dernier soin fait (le plus récent daté ; à défaut un soin fait sans date). */
  last?: T
  /** Prochain soin prévu, pas encore fait. */
  next?: T
}

/** Dernier soin fait et prochain soin prévu pour un type d’événement. */
export function careStatus<T extends CareEvent>(events: T[], type: EventType): CareStatus<T> {
  const own = events.filter((e) => e.type === type)
  const done = own.filter((e) => e.done)
  const last = done.filter((e) => doneDate(e)).sort((a, b) => doneDate(b).localeCompare(doneDate(a)))[0] ?? done[0]
  const next = own.filter((e) => !e.done && e.date).sort((a, b) => a.date.localeCompare(b.date))[0]
  return { last, next }
}

/** Le prochain rendez-vous chez le véto pas encore passé (aujourd’hui compris). */
export const nextVetVisit = <T extends { type: string; date: ISODate | ''; done: boolean }>(events: T[], today: ISODate): T | undefined =>
  events.filter((e) => e.type === 'veto' && !e.done && e.date && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]

/** Le jour du dernier soin fait d’un type (vide si aucun). */
export const lastDone = <T extends CareEvent>(events: T[], type: EventType): ISODate | '' => {
  const last = careStatus(events, type).last
  return last ? doneDate(last) : ''
}
