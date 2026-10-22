export interface Meal {
  label: string
  /** « HH:MM » */
  time: string
}

export interface Feeding {
  gramsPerDay: number
  meals: Meal[]
}

/** Portion par repas, arrondie au gramme. */
export function portion(feeding: Feeding): number | undefined {
  if (!feeding.meals.length || !feeding.gramsPerDay) return undefined
  return Math.round(feeding.gramsPerDay / feeding.meals.length)
}

/** Index du prochain repas de la journée ; `undefined` après le dernier. */
export function nextMealIndex(meals: Meal[], now: string): number | undefined {
  const index = meals.findIndex((meal) => meal.time > now)
  return index === -1 ? undefined : index
}

export const sortMeals = (meals: Meal[]): Meal[] => [...meals].sort((a, b) => a.time.localeCompare(b.time))

/** T-111 : 1, 2, 3 ou 4 repas par jour (1 est possible). */
export const MEAL_COUNTS = [1, 2, 3, 4] as const

/** Les heures proposées pour `count` repas, réparties sur la journée. */
const DEFAULT_TIMES: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '19:00'],
  3: ['08:00', '12:30', '19:00'],
  4: ['07:30', '12:00', '16:00', '19:30'],
}

/**
 * Passer à `count` repas : les heures déjà choisies restent (les premières de la journée), les repas en plus prennent
 * les heures proposées encore libres. `label` donne le nom d’un repas d’après son heure (« Matin »…).
 */
export function resizeMeals(meals: Meal[], count: number, label: (time: string) => string): Meal[] {
  const n = Math.min(4, Math.max(1, Math.round(count)))
  const kept = sortMeals(meals).slice(0, n)
  // Les heures proposées les plus éloignées des repas déjà là d’abord (pas deux repas à 30 min d’écart).
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const gap = (t: string) => Math.min(Infinity, ...kept.map((m) => Math.abs(min(m.time) - min(t))))
  const free = (DEFAULT_TIMES[n] ?? []).filter((t) => !kept.some((m) => m.time === t)).sort((a, b) => gap(b) - gap(a))
  const added = free.slice(0, n - kept.length).map((time) => ({ time, label: label(time) }))
  return sortMeals([...kept, ...added])
}

/** « 117 g par repas » : la ration du jour divisée par le nombre de repas, arrondie au gramme. */
export function mealPortion(gramsPerDay: number, count: number): number | undefined {
  if (!(gramsPerDay > 0) || !(count > 0)) return undefined
  return Math.round(gramsPerDay / count)
}
