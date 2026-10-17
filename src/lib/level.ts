import type { ProgressMap } from './bossProgress'

// Le niveau mesure ce que le chien sait faire (spec V3 § 2) : il est calculé à partir des étapes acquises,
// jamais stocké, et aucun point n'est affiché.

/** Toutes les étapes de l'arbre : 10 compétences × 5 étapes. */
export const TOTAL_STEPS = 50
export const STEPS_PER_LEVEL = 2
export const MAX_DOG_LEVEL = 1 + TOTAL_STEPS / STEPS_PER_LEVEL

/** Niveau = 1 + étapes acquises ÷ 2 (arrondi en dessous) : de 1 (aucune étape) à 26 (tout l'arbre). */
export const levelForSteps = (steps: number): number => Math.min(MAX_DOG_LEVEL, 1 + Math.floor(Math.max(0, steps) / STEPS_PER_LEVEL))

/** Étapes acquises, toutes compétences confondues. Celles d'avant l'app comptent comme les autres. */
export const stepsAcquired = (progress: ProgressMap): number => Object.values(progress).reduce((sum, p) => sum + (p?.level ?? 0), 0)

export interface DogLevel {
  level: number
  /** Étapes qu'il reste à acquérir avant le niveau suivant ; 0 au niveau maximum. */
  toNext: number
  /** Avancement vers le niveau suivant, de 0 à 1. */
  ratio: number
}

export function dogLevel(progress: ProgressMap): DogLevel {
  const steps = stepsAcquired(progress)
  const level = levelForSteps(steps)
  if (level >= MAX_DOG_LEVEL) return { level, toNext: 0, ratio: 1 }
  const into = steps % STEPS_PER_LEVEL
  return { level, toNext: STEPS_PER_LEVEL - into, ratio: into / STEPS_PER_LEVEL }
}
