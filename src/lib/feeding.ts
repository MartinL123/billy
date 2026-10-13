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
