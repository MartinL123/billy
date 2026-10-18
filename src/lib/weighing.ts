import { diffDays, isValidISO, type ISODate } from './dates'

// Rappel de pesée (T-013) : une pesée par mois tant que le chien grandit.

/** Une pesée tous les 30 jours. */
export const WEIGH_EVERY_DAYS = 30
/** Âge jusqu’auquel le chien grandit (en jours, environ 15 mois : les chiens de taille moyenne à grande grandissent jusque-là). */
export const GROWING_DAYS = 456

/** Faut-il proposer une pesée aujourd’hui ? Seulement si l’âge est connu et que le chien grandit encore. */
export function weighingDue({ today, birthDate, lastWeighed }: { today: ISODate; birthDate?: string; lastWeighed?: ISODate }): boolean {
  if (!birthDate || !isValidISO(birthDate)) return false
  if (diffDays(birthDate, today) >= GROWING_DAYS) return false
  return !lastWeighed || diffDays(lastWeighed, today) >= WEIGH_EVERY_DAYS
}
