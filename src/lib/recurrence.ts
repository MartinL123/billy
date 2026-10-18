import { addMonths, diffDays, parseISO, toISO, daysInMonth, type ISODate } from './dates'

export type Recurrence = 'none' | 'monthly' | 'quarterly' | 'yearly'

const MONTHS: Record<Recurrence, number> = { none: 0, monthly: 1, quarterly: 3, yearly: 12 }

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: '',
  monthly: 'Tous les mois',
  quarterly: 'Tous les 3 mois',
  yearly: 'Tous les ans',
}

/** Date de l’occurrence suivante, calculée depuis la date prévue (pas depuis le jour où c’est fait). */
export function nextOccurrence(date: ISODate, recurrence: Recurrence): ISODate | undefined {
  if (recurrence === 'none' || !date) return undefined
  return addMonths(date, MONTHS[recurrence])
}

/**
 * L’échéance suivante une fois un soin validé (audit R-001) : validé à temps ou en avance, la récurrence suit le
 * calendrier prévu ; validé en retard, elle repart du jour de validation (jamais d’échéance déjà passée).
 */
export function nextAfterDone(planned: ISODate, recurrence: Recurrence, doneOn: ISODate): ISODate | undefined {
  if (!planned) return nextOccurrence(doneOn, recurrence)
  return nextOccurrence(planned < doneOn ? doneOn : planned, recurrence)
}

/** Prochaine date annuelle (jour/mois) à partir d’aujourd’hui inclus. Le 29 févr. devient 28 hors année bissextile. */
export function nextAnnual(month: number, day: number, today: ISODate): ISODate {
  const { y } = parseISO(today)
  const inYear = (year: number) => toISO({ y: year, m: month, d: Math.min(day, daysInMonth(year, month)) })
  const candidate = inYear(y)
  return diffDays(today, candidate) >= 0 ? candidate : inYear(y + 1)
}
