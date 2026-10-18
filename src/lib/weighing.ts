import { diffDays, isValidISO, type ISODate } from './dates'

// Rappel de pesée (T-013) : une pesée par mois tant que le chien grandit.

/** Une pesée tous les 30 jours. */
export const WEIGH_EVERY_DAYS = 30
/** Âge jusqu’auquel le chien grandit (en jours, environ 15 mois : les chiens de taille moyenne à grande grandissent jusque-là). */
export const GROWING_DAYS = 456

/**
 * Faut-il proposer une pesée aujourd’hui ? Seulement si l’âge est connu (et passé) et que le chien grandit encore,
 * et pas si « Plus tard » a été touché aujourd’hui (`postponedOn`).
 */
export function weighingDue({ today, birthDate, lastWeighed, postponedOn }: { today: ISODate; birthDate?: string; lastWeighed?: ISODate; postponedOn?: ISODate }): boolean {
  if (postponedOn === today) return false
  if (!birthDate || !isValidISO(birthDate)) return false
  const age = diffDays(birthDate, today)
  if (age < 0 || age >= GROWING_DAYS) return false
  return !lastWeighed || diffDays(lastWeighed, today) >= WEIGH_EVERY_DAYS
}
