import { bossById } from '../content/training'
import type { ProgressMap } from './bossProgress'
import { dayNumber, type ISODate } from './dates'
import { weekOf } from './rhythm'
import { currentExercise } from './training-plan'

/** Le défi de la semaine : un seul, sur une compétence, compté d'après ce que l'utilisateur choisit lui-même. */
export interface Challenge {
  bossId: string
  label: string
  target: number
}

export const CHALLENGE_TARGET = 3

/** Le défi ne vise que des compétences sûres : jamais une situation de peur. */
export const SAFE_CHALLENGE_SKILLS = ['lien', 'calme', 'manieres']

/**
 * Le même sur tous les appareils ; il tourne chaque semaine entre Le Lien, Le Calme et Les Bonnes manières,
 * sur l'exercice de leur étape en cours.
 */
export function weekChallenge(week: ISODate, progress: ProgressMap = {}): Challenge {
  const n = Math.floor(dayNumber(week) / 7)
  const bossId = SAFE_CHALLENGE_SKILLS[((n % SAFE_CHALLENGE_SKILLS.length) + SAFE_CHALLENGE_SKILLS.length) % SAFE_CHALLENGE_SKILLS.length]!
  const exercise = currentExercise(bossId, progress[bossId]?.level ?? 0)?.exercise
  const label = exercise ? `${CHALLENGE_TARGET} fois « ${exercise.name} » cette semaine` : `Noter ${CHALLENGE_TARGET} moments pour ${bossById(bossId)?.name}`
  return { bossId, label, target: CHALLENGE_TARGET }
}

interface Dated {
  date: ISODate
}

/** Moments de la semaine où la compétence a été choisie, plus les exercices faits pour elle. Plafonné à la cible. */
export function challengeProgress(challenge: Challenge, today: ISODate, moments: (Dated & { skills?: string[] })[], sessions: (Dated & { bossId: string; bossIds?: string[] })[]): number {
  const week = new Set(weekOf(today))
  const told = moments.filter((m) => week.has(m.date) && m.skills?.includes(challenge.bossId)).length
  const practiced = sessions.filter((s) => week.has(s.date) && (s.bossIds ?? [s.bossId]).includes(challenge.bossId)).length
  return Math.min(challenge.target, told + practiced)
}
