import { ageAt } from './age'
import { isValidISO, type ISODate } from './dates'

// La règle des 5 minutes (T-019) : un chiot marche 5 minutes par mois d'âge, par sortie, 3 sorties par jour.
// À 5 mois : 25 minutes, 3 fois par jour. Une balade plus longue se rattrape sur les suivantes, plus courtes.

export const MINUTES_PER_MONTH = 5
export const WALKS_PER_DAY = 3
/** Au-delà d'un an, la règle ne s'applique plus. */
export const PUPPY_UNTIL_MONTHS = 12
/** Sous ce temps, la sortie n'est plus une balade : juste ses besoins. */
export const SHORTEST_WALK = 5

export interface WalkBudget {
  /** Âge en mois entiers. */
  months: number
  /** Durée d'une sortie : 5 min × l'âge en mois. */
  perWalk: number
  /** Le temps de marche du jour : 3 sorties. */
  daily: number
  /** Déjà marché aujourd'hui (minutes des balades importées). */
  walked: number
  /** La plus longue balade du jour, si elle dépasse la durée d'une sortie. */
  longWalk?: number
  /** Durée conseillée pour la prochaine sortie (0 : le temps du jour est fait). */
  next: number
}

const floorTo5 = (minutes: number) => Math.floor(minutes / 5) * 5

/**
 * Le budget de marche du jour. `walks` : les durées (minutes) des balades du jour ; `walksLeft` : les sorties qui
 * restent à faire. Sans date de naissance, ou pour un chien d'un an et plus : pas de règle.
 */
export function walkBudget({ birthDate, today, walks, walksLeft }: { birthDate?: string; today: ISODate; walks: number[]; walksLeft: number }): WalkBudget | undefined {
  if (!birthDate || !isValidISO(birthDate)) return undefined
  const age = ageAt(birthDate, today)
  const months = age.years * 12 + age.months
  if (months >= PUPPY_UNTIL_MONTHS) return undefined
  const perWalk = Math.max(1, months) * MINUTES_PER_MONTH
  const daily = perWalk * WALKS_PER_DAY
  const walked = Math.round(walks.reduce((sum, m) => sum + m, 0))
  const longest = Math.max(0, ...walks)
  const remaining = Math.max(0, daily - walked)
  // Ce qui reste du jour, réparti sur les sorties qui restent, jamais plus qu'une sortie normale.
  const share = walksLeft > 0 ? floorTo5(remaining / walksLeft) : 0
  const next = Math.min(perWalk, share)
  return { months, perWalk, daily, walked, next: next < SHORTEST_WALK ? 0 : next, ...(longest > perWalk ? { longWalk: Math.round(longest) } : {}) }
}

/** « 25 min », « 1 h 15 ». */
export const minutesLabel = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, '0')}` : ''}` : `${minutes} min`)
